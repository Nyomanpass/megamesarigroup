import { Pekerja } from "../models/Pekerja.js";

// GET
export const getPekerja = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await Pekerja.findAll({
      where: { project_id }
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE
export const createPekerja = async (req, res) => {
  try {
    const { project_id, nama, satuan, di_bilang } = req.body;

    const data = await Pekerja.create({
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
export const updatePekerja = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, satuan, di_bilang } = req.body;

    await Pekerja.update(
      { nama, satuan, di_bilang },
      { where: { id } }
    );

    res.json({ message: "Updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE
export const deletePekerja = async (req, res) => {
  try {
    const { id } = req.params;

    await Pekerja.destroy({
      where: { id }
    });

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};