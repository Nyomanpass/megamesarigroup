import { Project } from "./ProjectModel.js";
import { Boq } from "./BoqModel.js";
import { Schedule } from "./ScheduleModel.js";
import { DailyPlan } from "./DailyPlanModel.js";
import { DailyProgress } from "./DailyProgressModel.js";
import { ProjectPeriod } from "./ProjectPeriodModel.js";
import { ProjectWeek } from "./ProjectWeekModel.js";

// RELASI
Project.hasMany(Boq, { foreignKey: "project_id" });
Boq.belongsTo(Project, { foreignKey: "project_id" });

Boq.hasMany(Schedule, { foreignKey: "boq_id" });
Schedule.belongsTo(Boq, { foreignKey: "boq_id" });

Boq.hasMany(DailyPlan, { foreignKey: "boq_id" });
DailyPlan.belongsTo(Boq, { foreignKey: "boq_id" });

DailyProgress.belongsTo(Boq, {
  foreignKey: "boq_id",
  as: "boq"
});

Boq.hasMany(DailyProgress, {
  foreignKey: "boq_id",
  as: "daily_progress"
});
DailyProgress.belongsTo(Project, {
  foreignKey: "project_id",
  as: "project"
});

Project.hasMany(DailyProgress, {
  foreignKey: "project_id",
  as: "daily_progress"
});

Project.hasMany(ProjectPeriod, {
  foreignKey: "project_id",
  onDelete: "CASCADE"
});

ProjectPeriod.belongsTo(Project, {
  foreignKey: "project_id"
});

export {
  Project,
  Boq,
  Schedule,
  DailyPlan,
  DailyProgress,
  ProjectPeriod,
  ProjectWeek 
};