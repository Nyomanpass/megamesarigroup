import { Project } from "./ProjectModel.js";
import { Boq } from "./BoqModel.js";
import { Schedule } from "./ScheduleModel.js";
import { DailyPlan } from "./DailyPlanModel.js";
import { DailyProgress } from "./DailyProgressModel.js";
import { ProjectPeriod } from "./ProjectPeriodModel.js";
import { ProjectWeek } from "./ProjectWeekModel.js";

import { Material } from "./MaterialModel.js";
import { Pekerja } from "./Pekerja.js";
import { Peralatan } from "./PeralatanModel.js";
import { DailyPekerja } from "./DailyPekerja.js";
import { DailyPeralatan } from "./DailyPeralatan.js";
import { DailyMaterial } from "./DailyMaterial.js";

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


DailyProgress.hasMany(DailyMaterial, {
  foreignKey: "daily_progress_id",
  as: "materials"
});

DailyMaterial.belongsTo(DailyProgress, {
  foreignKey: "daily_progress_id"
});

DailyMaterial.belongsTo(Material, {
  foreignKey: "material_id",
  as: "material"
});

Material.hasMany(DailyMaterial, {
  foreignKey: "material_id"
});


DailyProgress.hasMany(DailyPeralatan, {
  foreignKey: "daily_progress_id",
  as: "tools"
});

DailyPeralatan.belongsTo(DailyProgress, {
  foreignKey: "daily_progress_id"
});

DailyPeralatan.belongsTo(Peralatan, {
  foreignKey: "tool_id",
  as: "tool"
});

Peralatan.hasMany(DailyPeralatan, {
  foreignKey: "tool_id"
});


DailyProgress.hasMany(DailyPekerja, {
  foreignKey: "daily_progress_id",
  as: "workers"
});

DailyPekerja.belongsTo(DailyProgress, {
  foreignKey: "daily_progress_id"
});

DailyPekerja.belongsTo(Pekerja, {
  foreignKey: "worker_id",
  as: "pekerja"
});

Pekerja.hasMany(DailyPekerja, {
  foreignKey: "worker_id"
});


export {
  Project,
  Boq,
  Schedule,
  DailyPlan,
  DailyProgress,
  ProjectPeriod,
  ProjectWeek,
  Material,
  Pekerja,
  Peralatan,
  DailyPekerja,
  DailyPeralatan,
  DailyMaterial
};