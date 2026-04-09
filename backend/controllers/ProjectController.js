import { Project } from "../models/ProjectModel.js";
import { MasterItem } from "../models/MasterItem.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { AnalisaMaster } from "../models/AnalisaMaster.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { AnalisaMasterDetail } from "../models/AnalisaMasterDetail.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";

// 🔥 GET ALL PROJECT (Dashboard)
export const getProjects = async (req, res) => {
  try {
    const data = await Project.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET DETAIL PROJECT
export const getProjectById = async (req, res) => {
  try {
    const data = await Project.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 CREATE PROJECT
export const createProject = async (req, res) => {
  try {
    // 🔥 ambil semua field project dari frontend
    const project = await Project.create(req.body);

    // ===============================
    // 1. COPY MASTER ITEMS
    // ===============================
    const masterItems = await MasterItem.findAll();

    const createdProjectItems = await ProjectItem.bulkCreate(
      masterItems.map((item) => ({
        project_id: project.id,
        nama: item.nama,
        tipe: item.tipe,
        satuan: item.satuan,
        harga: item.harga_default,
        category_id: item.category_id
      })),
      { returning: true }
    );

    // ===============================
    // 2. MAPPING ITEM 🔥
    // ===============================
    const itemMap = {};
    masterItems.forEach((m, i) => {
      itemMap[m.id] = createdProjectItems[i].id;
    });

    // ===============================
    // 3. COPY ANALISA
    // ===============================
    const masterAnalisa = await AnalisaMaster.findAll();

    const createdProjectAnalisa = await ProjectAnalisa.bulkCreate(
      masterAnalisa.map((a) => ({
        project_id: project.id,
        kode: a.kode,
        nama: a.nama,
        satuan: a.satuan,
        overhead_persen: a.overhead_persen
      })),
      { returning: true }
    );

    // ===============================
    // 4. COPY ANALISA DETAIL 🔥
    // ===============================
    for (let i = 0; i < masterAnalisa.length; i++) {
      const analisa = masterAnalisa[i];
      const projectAnalisa = createdProjectAnalisa[i];

      const details = await AnalisaMasterDetail.findAll({
        where: { analisa_id: analisa.id }
      });

      const detailData = details.map((d) => ({
        project_analisa_id: projectAnalisa.id,
        item_id: itemMap[d.item_id], // 🔥 mapping
        koefisien: d.koefisien,
        harga: 0,
        jumlah: 0
      }));

      await ProjectAnalisaDetail.bulkCreate(detailData);
    }

    // ===============================
    res.status(201).json({
      message: "Project berhasil dibuat + FULL template dicopy",
      project
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


// 🔥 UPDATE PROJECT
export const updateProject = async (req, res) => {
  try {
    await Project.update(req.body, {
      where: { id: req.params.id }
    });

    res.json({ message: "Project updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 DELETE PROJECT
export const deleteProject = async (req, res) => {
  try {
    await Project.destroy({
      where: { id: req.params.id }
    });

    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};