// MongoDB Index Creation Script for AVMS Project Performance Optimization
// Run this script in MongoDB shell or compass to improve query performance

// Primary index for project queries
db.projects.createIndex({ "_id": 1 });

// Index for valuations queries (commonly accessed paths)
db.projects.createIndex({ 
  "valuations.REPLICATION_RUN.batch_info.batch_results.batch_type": 1,
  "valuations.REPLICATION_RUN.batch_info.batch_results.result.active_employee_results.active_employees_results.employee_code": 1
});

db.projects.createIndex({ 
  "valuations.REPLICATION_RUN.batch_info.batch_results.batch_type": 1,
  "valuations.REPLICATION_RUN.batch_info.batch_results.result.pensioner_employee_results.pensioner_employees_results.employee_code": 1
});

// Compound index for batch results
db.projects.createIndex({
  "valuations.REPLICATION_RUN.batch_info.batch_results.batch_type": 1,
  "valuations.REPLICATION_RUN.batch_info.batch_results.started_at": -1
});

// Index for project name searches
db.projects.createIndex({ "name": 1 });

// If you have other stage names besides "REPLICATION_RUN", create similar indexes for those as well
// Example for another stage:
// db.projects.createIndex({ 
//   "valuations.YOUR_STAGE_NAME.batch_info.batch_results.batch_type": 1,
//   "valuations.YOUR_STAGE_NAME.batch_info.batch_results.result.active_employee_results.active_employees_results.employee_code": 1
// });

console.log("Database indexes created successfully for AVMS performance optimization");
