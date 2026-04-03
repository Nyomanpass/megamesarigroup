import { Project } from "../models/ProjectModel.js";

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
    const data = await Project.create(req.body);
    res.status(201).json(data);
  } catch (error) {
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