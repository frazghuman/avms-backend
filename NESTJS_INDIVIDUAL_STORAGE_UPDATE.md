# NestJS Backend Update for Individual Employee Storage

## Updated Endpoint
`GET /projects/{projectId}/stages/{stageName}/batches/{batchType}/employees/{employeeCode}/valuation-data`

## What Changed

### 1. Enhanced `getEmployeeRecordsByCode` Method
**File**: `src/project-management/services/project.service.ts`

**New Behavior**:
1. **Primary**: Queries new FastAPI individual employee storage endpoint
2. **Fallback**: Uses original MongoDB aggregation for backward compatibility

### 2. FastAPI Integration
The method now first tries to fetch employee data from the new FastAPI endpoint:
```
GET /projects/{projectId}/valuations/{stageName}/employee-results?employee_code={code}&employee_type={type}&limit=1
```

**Parameters**:
- `employee_code`: The specific employee code to find
- `employee_type`: Mapped from batchType ("pensioner_employees" → "pensioner", others → "active")
- `limit`: Set to 1 since we only need one employee's data

### 3. Data Transformation
The FastAPI response is transformed to match the expected NestJS format:

**FastAPI Response Structure**:
```javascript
{
  employee_results: [{
    project_id: "...",
    valuation_stage: "...",
    employee_code: "...",
    employee_type: "active|pensioner",
    batch_number: 1,
    valuation_data: [...],
    data_size: 1024,
    processed_at: "2025-01-25T...",
    batch_info: {...}
  }]
}
```

**Transformed to NestJS Format**:
```javascript
{
  projectName: "...",
  stageName: "...", 
  employee_code: 123,
  batchType: "active_employees|pensioner_employees",
  employeeType: "active|pensioner",
  batchInfo: {
    status: "completed",
    batch_number: 1,
    total_employees: 50,
    started_at: "...",
    completed_at: "..."
  },
  valuation_data: [...],
  total_valuation_records: 10
}
```

### 4. Backward Compatibility
If the FastAPI call fails (network issues, server down, no data found), the method automatically falls back to the original MongoDB aggregation pipeline.

### 5. Caching Strategy
- Cache key includes all parameters: `{projectId}_{stageName}_{batchType}_{employeeCode}`
- Cache TTL maintained from existing implementation
- Results from both FastAPI and MongoDB are cached identically

## Benefits

### 1. Performance Improvement
- **FastAPI**: Direct query for specific employee (O(1) with proper indexing)
- **Old Method**: Complex aggregation pipeline scanning batch results

### 2. Scalability
- No more MongoDB 16MB document size limits
- Can handle unlimited employees per project

### 3. Data Consistency
- Single source of truth for employee results
- Better data isolation and integrity

### 4. Zero Downtime Migration
- Gradual rollout with automatic fallback
- No breaking changes to existing API contracts
- Maintains exact same response format

## Usage Examples

### Request
```bash
GET /projects/655deb7ad4db58b094ef2983/stages/REPLICATION_RUN/batches/pensioner_employees/employees/1/valuation-data
```

### Response (Same as before)
```json
{
  "projectName": "Project Name",
  "stageName": "REPLICATION_RUN",
  "employee_code": 1,
  "batchType": "pensioner_employees", 
  "employeeType": "pensioner",
  "batchInfo": {
    "status": "completed",
    "batch_number": 1,
    "total_employees": 25,
    "started_at": "2025-01-25T10:00:00Z",
    "completed_at": "2025-01-25T10:05:00Z"
  },
  "valuation_data": [
    // Individual employee calculation results
  ],
  "total_valuation_records": 10
}
```

## Testing Recommendations

### 1. Test Both Data Sources
```bash
# Test with new individual storage (should work after processing)
GET /projects/{id}/stages/REPLICATION_RUN/batches/active_employees/employees/1/valuation-data

# Test fallback with old data structure
# (temporarily disable FastAPI to test fallback)
```

### 2. Test Different Employee Types
```bash
# Active employees
GET /projects/{id}/stages/{stage}/batches/active_employees/employees/{code}/valuation-data

# Pensioner employees  
GET /projects/{id}/stages/{stage}/batches/pensioner_employees/employees/{code}/valuation-data
```

### 3. Test Error Handling
- Invalid project ID
- Non-existent employee code
- Invalid stage name
- Network failures (FastAPI down)

## Environment Variables Required
Ensure `VALUATION_SERVER_URL` is set in the NestJS environment:
```bash
VALUATION_SERVER_URL=http://localhost:8000
```

## Monitoring
- Watch for "FastAPI individual storage query failed" warnings in logs
- Monitor cache hit rates and performance improvements
- Track usage of fallback vs new endpoint

This update provides a seamless transition to the new individual employee storage system while maintaining full backward compatibility.
