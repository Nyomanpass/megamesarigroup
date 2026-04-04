import { Material } from "../models/MaterialModel.js";

// GET ALL
export const getMaterials = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await Material.findAll({
      where: { project_id }
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE
export const createMaterial = async (req, res) => {
  try {
    const { project_id, nama, satuan } = req.body;

    const data = await Material.create({
      project_id,
      nama,
      satuan
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, satuan } = req.body;

    await Material.update(
      { nama, satuan },
      { where: { id } }
    );

    res.json({ message: "Updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    await Material.destroy({
      where: { id }
    });

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};