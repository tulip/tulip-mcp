/**
 * Tool handlers for the Tulip MCP server
 */

import { logger } from '../utils/Logger.js';
import { randomBytes } from 'crypto';

import { pathSegment } from '../networking/ApiClient.js';
import { countTableRecords, listTableRecords, runTableAggregation } from './tableReads.js';

const LIST_PARAMS = ['limit', 'offset', 'sort', 'filter', 'search', 'archived'];
const ASSIGNMENT_FIELDS = ['type', 'tag', 'appFolderId', 'appId', 'appVersionId'];

// A random ID in the 17-character form Tulip uses
function randomId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from(randomBytes(17), byte => chars[byte % chars.length]).join('');
}

// The given keys of args that are set
function pick(args, keys) {
  return Object.fromEntries(keys.filter(key => args[key] !== undefined && args[key] !== null && args[key] !== '').map(key => [key, args[key]]));
}

// Reject a call that is missing required arguments before anything is sent
function checkRequired(definition, args) {
  const missing = (definition?.inputSchema?.required || []).filter(key => args[key] === undefined || args[key] === null || args[key] === '');
  if (missing.length) throw new Error(`Missing required argument(s): ${missing.join(', ')}`);
}

// Saved table query body. tableId must also be in the body and match the path,
// and the API requires an _id on every filter, so one is generated if missing.
function queryBody(args) {
  return {
    label: args.label,
    tableId: args.tableId,
    filters: (args.filters || []).map(filter => ({ _id: randomId(), ...filter })),
    filterAggregator: args.filterAggregator || 'all',
    sortOptions: args.sortOptions || [],
    limit: args.limit,
  };
}

/**
 * Tool handlers class that contains all the business logic for executing tools
 */
export class ToolHandlers {
  constructor(apiClient, toolSelection) {
    this.apiClient = apiClient;
    this.toolSelection = toolSelection;
  }

  async handleToolCall(name, args) {
    if (!this.toolSelection.isValidTool(name)) {
      return { content: [{ type: 'text', text: `Unknown tool '${name}'.` }], isError: true };
    }

    // Check if tool is enabled
    if (!this.toolSelection.isToolEnabled(name)) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool '${name}' is not enabled.\n\nCurrent Configuration:\n  Categories: ${Array.from(this.toolSelection.getEnabledToolCategories()).join(', ') || 'none'}\n  Types: ${Array.from(this.toolSelection.getEnabledToolTypes()).join(', ') || 'none'}\n\nTool Information:\n  Category: ${this.toolSelection.getToolCategory(name)}\n  Type: ${this.toolSelection.getToolType(name)}\n\nTo enable this tool, set ENABLED_TOOLS with one of:\n  1. Individual tool: ENABLED_TOOLS=${name}\n  2. By category: ENABLED_TOOLS=${this.toolSelection.getToolCategory(name)}\n  3. By type: ENABLED_TOOLS=${this.toolSelection.getToolType(name)} (types do not include admin tools)\n  4. Combined: ENABLED_TOOLS=table,read-only,${name}\n\nAvailable categories: ${this.toolSelection.getAvailableToolCategories().join(', ')}\nAvailable types: ${this.toolSelection.getAvailableToolTypes().join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    // Add safety warning for dangerous tools
    if (this.toolSelection.isToolDangerous(name)) {
      logger.debug(`⚠️  EXECUTING DANGEROUS TOOL: ${name} - This operation can modify or delete data permanently`);
    }

    try {
      checkRequired(this.toolSelection.toolDefinitions?.getToolDefinition?.(name), args);
      let result;
      // Caveats a read tool wants the caller to see (e.g. truncation)
      let notes = [];
      
      const api = this.apiClient;
      // Encoded, validated path segment for an ID argument
      const id = key => pathSegment(args[key], key);
      const stations = path => api.createNextGenApiUrl(path);
      const users = path => api.createNextGenUsersApiUrl(path);

      switch (name) {
        case 'listAppGroups':
          result = await api.makeRequest('/appGroups');
          break;

        case 'listMachineTypes':
          result = await api.makeRequest('/machines');
          break;

        case 'generateMachineActivityArchive':
          result = await api.makeRequest(`/machines/archive/${id('machineId')}`, 'POST');
          break;

        case 'retrieveMachineActivityArchive':
          result = await api.makeRequest(`/machines/archive/csv/${id('jobId')}`);
          break;

        case 'reportAttributes':
          result = await api.makeRequest('/attributes/report', 'POST', { attributes: args.attributes });
          break;

        case 'createUser':
          result = await api.makeRequest('/users', 'POST', pick(args, ['role', 'name', 'badge_id']));
          break;

        case 'listTables':
          result = await api.makeRequest('/tables', 'GET', null, pick(args, ['limit', 'offset', 'includeDeleted']));
          break;

        case 'createTable':
          result = await api.makeRequest('/tables', 'POST', args.tableData);
          break;

        case 'getTable':
          result = await api.makeRequest(`/tables/${id('tableId')}`);
          break;

        case 'updateTable':
          result = await api.makeRequest(`/tables/${id('tableId')}`, 'PUT', args.tableData);
          break;

        case 'listTableRecords':
          ({ records: result, notes } = await listTableRecords(api, args));
          break;

        case 'createTableRecord':
          result = await api.makeRequest(`/tables/${id('tableId')}/records`, 'POST', args.recordData);
          break;

        case 'getTableRecord':
          result = await api.makeRequest(`/tables/${id('tableId')}/records/${id('recordId')}`, 'GET', null, pick(args, ['fields']));
          break;

        case 'updateTableRecord':
          result = await api.makeRequest(`/tables/${id('tableId')}/records/${id('recordId')}`, 'PUT', args.recordData);
          break;

        case 'deleteTableRecord':
          result = await api.makeRequest(`/tables/${id('tableId')}/records/${id('recordId')}`, 'DELETE');
          // The API answers 204 with no body when no record has that ID
          if (result === '') result = `No record found with id ${JSON.stringify(args.recordId)}; nothing was deleted.`;
          break;

        case 'deleteAllTableRecords':
          result = await api.makeRequest(`/tables/${id('tableId')}/records`, 'DELETE', null, pick(args, ['allowRecordsInUse']));
          break;

        case 'countTableRecords':
          result = await countTableRecords(api, args);
          break;

        case 'runTableAggregation':
          ({ notes, ...result } = await runTableAggregation(api, args));
          break;

        case 'incrementTableRecordField':
          result = await api.makeRequest(`/tables/${id('tableId')}/records/${id('recordId')}/increment`, 'PATCH', pick(args, ['fieldName', 'value']));
          break;

        case 'createTableLink':
          result = await api.makeRequest('/tableLinks', 'POST', args.linkData);
          break;

        case 'getTableLink':
          result = await api.makeRequest(`/tableLinks/${id('tableLinkId')}`);
          break;

        case 'updateTableLinkLabels':
          result = await api.makeRequest(`/tableLinks/${id('tableLinkId')}`, 'PUT', pick(args, ['leftColumnLabel', 'rightColumnLabel']));
          break;

        case 'linkTableRecords':
          result = await api.makeRequest(`/tableLinks/${id('tableLinkId')}/link`, 'PUT', pick(args, ['leftRecord', 'rightRecord']));
          break;

        case 'unlinkTableRecords':
          result = await api.makeRequest(`/tableLinks/${id('tableLinkId')}/unlink`, 'PUT', pick(args, ['leftRecord', 'rightRecord']));
          break;

        // ========================================
        // TABLE AGGREGATIONS API
        // ========================================

        case 'createTableAggregation':
          result = await api.makeRequest(`/tables/${id('tableId')}/aggregations`, 'POST', pick(args, ['field', 'fn', 'label', 'tableId']));
          break;

        case 'getTableAggregation':
          result = await api.makeRequest(`/tables/${id('tableId')}/aggregation/${id('aggregationId')}`);
          break;

        case 'listTableAggregations':
          result = await api.makeRequest(`/tables/${id('tableId')}/aggregations`, 'GET', null, pick(args, ['field', 'fn']));
          break;

        case 'updateTableAggregation':
          result = await api.makeRequest(`/tables/${id('tableId')}/aggregation/${id('aggregationId')}`, 'PUT', pick(args, ['field', 'fn', 'label', 'tableId']));
          break;

        case 'deleteTableAggregation':
          result = await api.makeRequest(`/tables/${id('tableId')}/aggregation/${id('aggregationId')}`, 'DELETE');
          break;

        // ========================================
        // TABLE QUERIES API
        // ========================================

        case 'createTableQuery':
          result = await api.makeRequest(`/tables/${id('tableId')}/queries`, 'POST', queryBody(args));
          break;

        case 'getTableQuery':
          result = await api.makeRequest(`/tables/${id('tableId')}/query/${id('queryId')}`);
          break;

        case 'listTableQueries':
          result = await api.makeRequest(`/tables/${id('tableId')}/queries`);
          break;

        case 'updateTableQuery':
          result = await api.makeRequest(`/tables/${id('tableId')}/query/${id('queryId')}`, 'PUT', queryBody(args));
          break;

        case 'deleteTableQuery':
          result = await api.makeRequest(`/tables/${id('tableId')}/query/${id('queryId')}`, 'DELETE');
          break;

        case 'signUrls':
          result = await api.makeRequest('/signURLs', 'POST', { urls: args.urls });
          break;

        // ========================================
        // STATIONS/INTERFACES API (Next-Gen API)
        // ========================================

        case 'listInterfaces':
          result = await api.makeRequest(stations('/interfaces'), 'GET', null, pick(args, LIST_PARAMS));
          break;

        case 'createInterface':
          result = await api.makeRequest(stations('/interfaces'), 'POST',
            pick(args, ['name', 'stationId', 'isRegistrationLinkReusable']), pick(args, ['replaceInterfaceAtStation']));
          break;

        case 'getInterface':
          result = await api.makeRequest(stations(`/interfaces/${id('interfaceId')}`));
          break;

        case 'updateInterface':
          result = await api.makeRequest(stations(`/interfaces/${id('interfaceId')}`), 'PATCH', args.interfaceData);
          break;

        case 'archiveInterface':
          result = await api.makeRequest(stations(`/interfaces/${id('interfaceId')}/archive`), 'POST');
          break;

        case 'deleteInterfaceStationAssignment':
          result = await api.makeRequest(stations(`/interfaces/${id('interfaceId')}/station-assignment`), 'DELETE');
          break;

        case 'updateInterfaceStationAssignment':
          // replaceInterfaceAtStation is a query parameter; in the body it is ignored
          result = await api.makeRequest(stations(`/interfaces/${id('interfaceId')}/station-assignment`), 'PUT',
            pick(args, ['stationId']), pick(args, ['replaceInterfaceAtStation']));
          break;

        // ========================================
        // STATION GROUPS API (Next-Gen API)
        // ========================================

        case 'listStationGroups':
          result = await api.makeRequest(stations('/station-groups'), 'GET', null, pick(args, LIST_PARAMS));
          break;

        case 'createStationGroup':
          result = await api.makeRequest(stations('/station-groups'), 'POST', args.stationGroupData);
          break;

        case 'getStationGroup':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}`));
          break;

        case 'updateStationGroup':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}`), 'PATCH', args.stationGroupData);
          break;

        case 'archiveStationGroup':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/archive`), 'POST');
          break;

        case 'updateStationGroupStations':
          if (!args.add?.length && !args.remove?.length) throw new Error('Pass station IDs in add and/or remove.');
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/stations`), 'PATCH', pick(args, ['add', 'remove']));
          break;

        // ========================================
        // STATIONS API (Next-Gen API)
        // ========================================

        case 'listStations':
          result = await api.makeRequest(stations('/stations'), 'GET', null, pick(args, LIST_PARAMS));
          break;

        case 'createStation':
          result = await api.makeRequest(stations('/stations'), 'POST', args.stationData);
          break;

        case 'getStation':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}`));
          break;

        case 'updateStation':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}`), 'PATCH', args.stationData);
          break;

        case 'archiveStation':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}/archive`), 'POST');
          break;

        // ========================================
        // STATION APP ASSIGNMENTS API
        // ========================================

        case 'listStationAppAssignments':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}/app-assignments`), 'GET', null, pick(args, ['limit', 'offset']));
          break;

        case 'createStationAppAssignment':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}/app-assignments`), 'POST', args.appAssignmentData);
          break;

        case 'deleteStationAppAssignment':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}/app-assignments/${id('appAssignmentId')}`), 'DELETE');
          break;

        case 'manageStationAppAssignment':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}/app-assignments/${id('appAssignmentId')}`), 'PUT', pick(args, ASSIGNMENT_FIELDS));
          break;

        case 'removeAllStationAppAssignments':
          result = await api.makeRequest(stations(`/stations/${id('stationId')}/app-assignments`), 'DELETE');
          break;

        // ========================================
        // STATION GROUP APP ASSIGNMENTS API
        // ========================================

        case 'listStationGroupAppAssignments':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/app-assignments`), 'GET', null, pick(args, ['limit', 'offset']));
          break;

        case 'createStationGroupAppAssignment':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/app-assignments`), 'POST', args.appAssignmentData);
          break;

        case 'deleteStationGroupAppAssignment':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/app-assignments/${id('appAssignmentId')}`), 'DELETE');
          break;

        case 'manageStationGroupAppAssignment':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/app-assignments/${id('appAssignmentId')}`), 'PUT', pick(args, ASSIGNMENT_FIELDS));
          break;

        case 'removeAllStationGroupAppAssignments':
          result = await api.makeRequest(stations(`/station-groups/${id('stationGroupId')}/app-assignments`), 'DELETE');
          break;

        // ========================================
        // USERS API (Next-Gen API)
        // ========================================

        case 'listUserRoles':
          result = await api.makeRequest(users('/roles'));
          break;

        case 'getUserRole':
          result = await api.makeRequest(users(`/roles/${id('userRoleId')}`));
          break;

        case 'listUserGroups':
          result = await api.makeRequest(users('/user-groups'), 'GET', null, pick(args, LIST_PARAMS));
          break;

        case 'getUserGroup':
          result = await api.makeRequest(users(`/user-groups/${id('userGroupId')}`));
          break;

        case 'getUserGroupUsers':
          result = await api.makeRequest(users(`/user-groups/${id('userGroupId')}/users`), 'GET', null, pick(args, ['limit', 'offset', 'filter']));
          break;

        case 'listUsers':
          result = await api.makeRequest(users('/users'), 'GET', null, pick(args, LIST_PARAMS));
          break;

        case 'getUser':
          result = await api.makeRequest(users(`/users/${id('userId')}`));
          break;

        case 'listUserUserGroups':
          result = await api.makeRequest(users(`/users/${id('userId')}/user-groups`), 'GET', null, pick(args, ['limit', 'offset', 'filter']));
          break;

        default:
          throw new Error(`Tool ${name} has no handler.`);
      }

      // Successful writes with no response body (204) still report success
      if (result === '' || result === null || result === undefined) result = { success: true };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
          ...notes.map(note => ({ type: 'text', text: `Note: ${note}` })),
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
