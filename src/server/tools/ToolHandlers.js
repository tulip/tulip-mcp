/**
 * Tool handlers for the Tulip MCP server
 */

import { logger } from '../utils/Logger.js';

/**
 * Tool handlers class that contains all the business logic for executing tools
 */
export class ToolHandlers {
  constructor(apiClient, toolSelection) {
    this.apiClient = apiClient;
    this.toolSelection = toolSelection;
  }

  async handleToolCall(name, args) {
    // Check if tool is enabled
    if (!this.toolSelection.isToolEnabled(name)) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool '${name}' is not enabled.\n\nCurrent Configuration:\n  Categories: ${Array.from(this.toolSelection.getEnabledToolCategories()).join(', ') || 'none'}\n  Types: ${Array.from(this.toolSelection.getEnabledToolTypes()).join(', ') || 'none'}\n\nTool Information:\n  Category: ${this.toolSelection.getToolCategory(name)}\n  Type: ${this.toolSelection.getToolType(name)}\n\nTo enable this tool, set ENABLED_TOOLS with one of:\n  1. Individual tool: ENABLED_TOOLS=${name}\n  2. By category: ENABLED_TOOLS=${this.toolSelection.getToolCategory(name)}\n  3. By type: ENABLED_TOOLS=${this.toolSelection.getToolType(name)}\n  4. Combined: ENABLED_TOOLS=table,read-only,${name}\n\nAvailable categories: ${this.toolSelection.getAvailableToolCategories().join(', ')}\nAvailable types: ${this.toolSelection.getAvailableToolTypes().join(', ')}`,
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
      let result;
      
      switch (name) {
        case 'listAppGroups':
          result = await this.apiClient.makeRequest('/appGroups');
          break;

        case 'listMachineTypes':
          result = await this.apiClient.makeRequest('/machines');
          break;

        case 'generateMachineActivityArchive':
          result = await this.apiClient.makeRequest(`/machines/archive/${args.machineId}`, 'POST');
          break;

        case 'retrieveMachineActivityArchive':
          result = await this.apiClient.makeRequest(`/machines/archive/csv/${args.jobId}`);
          break;

        case 'reportAttributes':
          result = await this.apiClient.makeRequest('/attributes/report', 'POST', args.attributes);
          break;

        case 'createUser':
          const userData = {
            role: args.role,
            name: args.name
          };
          if (args.badge_id) {
            userData.badge_id = args.badge_id;
          }
          result = await this.apiClient.makeRequest('/users', 'POST', userData);
          break;

        case 'listTables':
          result = await this.apiClient.makeRequest('/tables');
          break;

        case 'createTable':
          result = await this.apiClient.makeRequest('/tables', 'POST', args.tableData);
          break;

        case 'getTable':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}`);
          break;

        case 'updateTable':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}`, 'PUT', args.tableData);
          break;

        case 'listTableRecords':
          const queryParams = {};
          if (args.limit) queryParams.limit = args.limit;
          if (args.offset) queryParams.offset = args.offset;
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records`, 'GET', null, queryParams);
          break;

        case 'createTableRecord':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records`, 'POST', args.recordData);
          break;

        case 'getTableRecord':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records/${args.recordId}`);
          break;

        case 'updateTableRecord':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records/${args.recordId}`, 'PUT', args.recordData);
          break;

        case 'deleteTableRecord':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records/${args.recordId}`, 'DELETE');
          break;

        case 'deleteAllTableRecords':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records`, 'DELETE');
          break;

        case 'countTableRecords':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/count`);
          break;

        case 'runTableAggregation':
          const aggQueryParams = {
            'function': args['function'],
            fieldId: args.fieldId,
            limit: args.limit,
          };
          if (args.sortOptions) {
            aggQueryParams.sortOptions = args.sortOptions;
          }
          if (args.filters) {
            aggQueryParams.filters = args.filters;
          }
          if (args.filterAggregator) {
            aggQueryParams.filterAggregator = args.filterAggregator;
          }
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/runAggregation`, 'GET', null, aggQueryParams);
          break;

        case 'incrementTableRecordField':
          const incrementData = {
            fieldName: args.fieldName,
            value: args.value
          };
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/records/${args.recordId}/increment`, 'PATCH', incrementData);
          break;

        case 'createTableLink':
          result = await this.apiClient.makeRequest('/tableLinks', 'POST', args.linkData);
          break;

        case 'getTableLink':
          result = await this.apiClient.makeRequest(`/tableLinks/${args.tableLinkId}`);
          break;

        case 'updateTableLinkLabels':
           const updateTableLinkData = {
            leftColumnLabel: args.leftColumnLabel,
            rightColumnLabel: args.rightColumnLabel
          };
          result = await this.apiClient.makeRequest(`/tableLinks/${args.tableLinkId}`, 'PUT', updateTableLinkData);
          break;
        case 'linkTableRecords':
          const linkData = {
            leftRecord: args.leftRecord,
            rightRecord: args.rightRecord
          };
          result = await this.apiClient.makeRequest(`/tableLinks/${args.tableLinkId}/link`, 'PUT', linkData);
          break;

        case 'unlinkTableRecords':
          const unlinkData = {
            leftRecord: args.leftRecord,
            rightRecord: args.rightRecord
          };
          result = await this.apiClient.makeRequest(`/tableLinks/${args.tableLinkId}/unlink`, 'PUT', unlinkData);
          break;

        // ========================================
        // TABLE AGGREGATIONS API
        // ========================================

        case 'createTableAggregation':
          const createAggData = {
            field: args.field,
            fn: args.fn,
            label: args.label,
            tableId: args.tableId,
          };
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/aggregations`, 'POST', createAggData);
          break;

        case 'getTableAggregation':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/aggregation/${args.aggregationId}`);
          break;

        case 'listTableAggregations':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/aggregations`);
          break;

        case 'updateTableAggregation':
          const updateAggData = {
            field: args.field,
            fn: args.fn,
            label: args.label,
            tableId: args.tableId
          };
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/aggregation/${args.aggregationId}`, 'PUT', updateAggData);
          break;

        case 'deleteTableAggregation':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/aggregation/${args.aggregationId}`, 'DELETE');
          break;

        // ========================================
        // TABLE QUERIES API
        // ========================================

        case 'createTableQuery':
          const createQueryData = {
            label: args.label,
            tableId: args.tableId,
            filters: args.filters || [],
            filterAggregator: args.filterAggregator,
            sortOptions: args.sortOptions || [],
            limit: args.limit
          };
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/queries`, 'POST', createQueryData);
          break;

        case 'getTableQuery':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/query/${args.queryId}`);
          break;

        case 'listTableQueries':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/queries`);
          break;

        case 'updateTableQuery':
          const updateQueryData = {
            label: args.label,
            tableId: args.tableId,
            filters: args.filters || [],
            filterAggregator: args.filterAggregator,
            sortOptions: args.sortOptions || [],
            limit: args.limit
          };
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/query/${args.queryId}`, 'PUT', updateQueryData);
          break;

        case 'deleteTableQuery':
          result = await this.apiClient.makeRequest(`/tables/${args.tableId}/query/${args.queryId}`, 'DELETE');
          break;

        case 'signUrls':
          result = await this.apiClient.makeRequest('/signURLs', 'POST', { urls: args.urls });
          break;

        // ========================================
        // STATIONS/INTERFACES API (Next-Gen API)
        // ========================================

        case 'listInterfaces':
          const interfaceQueryParams = {};
          if (args.limit) interfaceQueryParams.limit = args.limit;
          if (args.offset) interfaceQueryParams.offset = args.offset;
          if (args.sort) interfaceQueryParams.sort = args.sort;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl('/interfaces'), 'GET', null, interfaceQueryParams);
          break;

        case 'createInterface':
          const createInterfaceBody = {
            name: args.name,
            stationId: args.stationId,
          };
          const createInterfaceQuery = {};
          if (args.replaceInterfaceAtStation !== undefined) {
            createInterfaceQuery.replaceInterfaceAtStation = args.replaceInterfaceAtStation;
          }
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl('/interfaces'), 'POST', createInterfaceBody, createInterfaceQuery);
          break;

        case 'getInterface':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/interfaces/${args.interfaceId}`));
          break;

        case 'updateInterface':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/interfaces/${args.interfaceId}`), 'PATCH', args.interfaceData);
          break;

        case 'archiveInterface':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/interfaces/${args.interfaceId}/archive`), 'POST');
          break;

        case 'deleteInterfaceStationAssignment':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/interfaces/${args.interfaceId}/station-assignment`), 'DELETE');
          break;

        case 'updateInterfaceStationAssignment':
          const updateStationAssignmentData = {};
          if (args.stationId) updateStationAssignmentData.stationId = args.stationId;
          if (args.replaceInterfaceAtStation !== undefined) updateStationAssignmentData.replaceInterfaceAtStation = args.replaceInterfaceAtStation;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/interfaces/${args.interfaceId}/station-assignment`), 'PUT', updateStationAssignmentData);
          break;

        // ========================================
        // STATION GROUPS API (Next-Gen API)
        // ========================================

        case 'listStationGroups':
          const stationGroupQueryParams = {};
          if (args.limit) stationGroupQueryParams.limit = args.limit;
          if (args.offset) stationGroupQueryParams.offset = args.offset;
          if (args.sort) stationGroupQueryParams.sort = args.sort;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl('/station-groups'), 'GET', null, stationGroupQueryParams);
          break;

        case 'createStationGroup':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl('/station-groups'), 'POST', args.stationGroupData);
          break;

        case 'getStationGroup':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}`));
          break;

        case 'updateStationGroup':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}`), 'PATCH', args.stationGroupData);
          break;

        case 'archiveStationGroup':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/archive`), 'POST');
          break;

        case 'updateStationGroupStations':
          const stationGroupStationsData = {};
          if (args.stationIds) stationGroupStationsData.stationIds = args.stationIds;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/stations`), 'PATCH', stationGroupStationsData);
          break;

        // ========================================
        // STATIONS API (Next-Gen API)
        // ========================================

        case 'listStations':
          const stationQueryParams = {};
          if (args.limit) stationQueryParams.limit = args.limit;
          if (args.offset) stationQueryParams.offset = args.offset;
          if (args.sort) stationQueryParams.sort = args.sort;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl('/stations'), 'GET', null, stationQueryParams);
          break;

        case 'createStation':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl('/stations'), 'POST', args.stationData);
          break;

        case 'getStation':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}`));
          break;

        case 'updateStation':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}`), 'PATCH', args.stationData);
          break;

        case 'archiveStation':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}/archive`), 'POST');
          break;

        // ========================================
        // STATION APP ASSIGNMENTS API
        // ========================================

        case 'listStationAppAssignments':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}/app-assignments`));
          break;

        case 'createStationAppAssignment':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}/app-assignments`), 'POST', args.appAssignmentData);
          break;

        case 'deleteStationAppAssignment':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}/app-assignments/${args.appAssignmentId}`), 'DELETE');
          break;

        case 'manageStationAppAssignment':
          const manageStationAppData = {
            type: args.type,
            tag: args.tag
          };
          if (args.appFolderId) manageStationAppData.appFolderId = args.appFolderId;
          if (args.appId) manageStationAppData.appId = args.appId;
          if (args.appVersionId) manageStationAppData.appVersionId = args.appVersionId;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}/app-assignments/${args.appAssignmentId}`), 'PUT', manageStationAppData);
          break;

        case 'removeAllStationAppAssignments':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/stations/${args.stationId}/app-assignments`), 'DELETE');
          break;

        // ========================================
        // STATION GROUP APP ASSIGNMENTS API
        // ========================================

        case 'listStationGroupAppAssignments':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/app-assignments`));
          break;

        case 'createStationGroupAppAssignment':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/app-assignments`), 'POST', args.appAssignmentData);
          break;

        case 'deleteStationGroupAppAssignment':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/app-assignments/${args.appAssignmentId}`), 'DELETE');
          break;

        case 'manageStationGroupAppAssignment':
          const manageStationGroupAppData = {
            type: args.type,
            tag: args.tag
          };
          if (args.appFolderId) manageStationGroupAppData.appFolderId = args.appFolderId;
          if (args.appId) manageStationGroupAppData.appId = args.appId;
          if (args.appVersionId) manageStationGroupAppData.appVersionId = args.appVersionId;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/app-assignments/${args.appAssignmentId}`), 'PUT', manageStationGroupAppData);
          break;

        case 'removeAllStationGroupAppAssignments':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenApiUrl(`/station-groups/${args.stationGroupId}/app-assignments`), 'DELETE');
          break;

        // ========================================
        // USERS API (Next-Gen API)
        // ========================================

        case 'listUserRoles':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl('/roles'));
          break;

        case 'getUserRole':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl(`/roles/${args.userRoleId}`));
          break;

        case 'listUserGroups':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl('/user-groups'));
          break;

        case 'getUserGroup':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl(`/user-groups/${args.userGroupId}`));
          break;

        case 'getUserGroupUsers':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl(`/user-groups/${args.userGroupId}/users`));
          break;

        case 'listUsers':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl('/users'));
          break;

        case 'getUser':
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl(`/users/${args.userId}`));
          break;

        case 'listUserUserGroups':
          const userGroupsQueryParams = {};
          if (args.limit) userGroupsQueryParams.limit = args.limit;
          if (args.offset) userGroupsQueryParams.offset = args.offset;
          if (args.filter) userGroupsQueryParams.filter = args.filter;
          result = await this.apiClient.makeRequest(this.apiClient.createNextGenUsersApiUrl(`/users/${args.userId}/user-groups`), 'GET', null, userGroupsQueryParams);
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Tool implementation needed: ${name} - This tool is defined but needs specific implementation based on the Tulip API parameters.`,
              },
            ],
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
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
