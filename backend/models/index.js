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


import { MasterItem } from "./MasterItem.js";
import { AnalisaMaster } from "./AnalisaMaster.js";
import { AnalisaMasterDetail } from "./AnalisaMasterDetail.js";
import { ItemCategory } from "./ItemCategory.js";

import { ProjectItem } from "./ProjekItem.js";
import { ProjectAnalisa } from "./ProjekAnalisa.js";
import { ProjectAnalisaDetail } from "./ProjekAnalisaDetail.js";
import { DailyProgressItem } from "./DailyProgresItem.js";


// PARENT → CHILD
DailyProgress.hasMany(DailyProgressItem, {
  foreignKey: "daily_progress_id",
  as: "items",
  onDelete: "CASCADE"
});

DailyProgressItem.belongsTo(DailyProgress, {
  foreignKey: "daily_progress_id",
  as: "progress"
});


// CHILD → MASTER ITEM
DailyProgressItem.belongsTo(ProjectItem, {
  foreignKey: "item_id",
  as: "item"
});

ProjectItem.hasMany(DailyProgressItem, {
  foreignKey: "item_id",
  as: "daily_items"
});



//relasi analisa dan boq
// 🔥 BOQ → ANALISA
Boq.belongsTo(ProjectAnalisa, {
  foreignKey: "analisa_id",
  as: "analisa"
});

// 🔥 ANALISA → BOQ
ProjectAnalisa.hasMany(Boq, {
  foreignKey: "analisa_id",
  as: "boq_items"
});

// analisa projek relation
ProjectAnalisaDetail.belongsTo(ProjectItem, {
  foreignKey: "item_id",
  as: "item"
});

ProjectItem.hasMany(ProjectAnalisaDetail, {
  foreignKey: "item_id",
  as: "details"
});

ProjectAnalisaDetail.belongsTo(ProjectAnalisa, {
  foreignKey: "project_analisa_id",
  as: "analisa"
});

ProjectAnalisa.hasMany(ProjectAnalisaDetail, {
  foreignKey: "project_analisa_id",
  as: "details"
});


ProjectItem.belongsTo(ItemCategory, {
  foreignKey: "category_id",
  as: "category" // 🔥 HARUS SAMA DENGAN INCLUDE
});

ItemCategory.hasMany(ProjectItem, {
  foreignKey: "category_id",
  as: "project_items"
});
// =====================
// ANALISA MASTER RELATION
// =====================

MasterItem.belongsTo(ItemCategory, {
  foreignKey: "category_id"
});

ItemCategory.hasMany(MasterItem, {
  foreignKey: "category_id"
});

// AnalisaMaster → Detail
AnalisaMaster.hasMany(AnalisaMasterDetail, {
  foreignKey: "analisa_id",
  as: "details",
  onDelete: "CASCADE"
});

AnalisaMasterDetail.belongsTo(AnalisaMaster, {
  foreignKey: "analisa_id"
});


// Detail → MasterItem
AnalisaMasterDetail.belongsTo(MasterItem, {
  foreignKey: "item_id",
  as: "item"
});

MasterItem.hasMany(AnalisaMasterDetail, {
  foreignKey: "item_id"
});


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
  ProjectWeek,
  Material,
  Pekerja,
  Peralatan,
  MasterItem,
  AnalisaMaster,
  AnalisaMasterDetail,
  ProjectAnalisaDetail,
  ProjectItem,
  ProjectAnalisa,
  DailyProgressItem
};