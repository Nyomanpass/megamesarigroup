import { Peralatan } from "../models/PeralatanModel.js";

// GET
export const getPeralatan = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await Peralatan.findAll({
      where: { project_id }
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE
export const createPeralatan = async (req, res) => {
  try {
    const { project_id, nama, satuan, di_bilang } = req.body;

    const data = await Peralatan.create({
      project_id,
      nama,
      satuan,
      di_bilang
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE
export const updatePeralatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, satuan, di_bilang } = req.body;

    await Peralatan.update(
      { nama, satuan, di_bilang },
      { where: { id } }
    );

    res.json({ message: "Updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE
export const deletePeralatan = async (req, res) => {
  try {
    const { id } = req.params;

    await Peralatan.destroy({
      where: { id }
    });

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};