import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
const toNumber = (value) => Number(value || 0);

export const getProjectAnalisaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 ambil analisa + project_id
    const analisa = await ProjectAnalisa.findByPk(id);

    if (!analisa) {
      return res.status(404).json({ message: "Analisa tidak ditemukan" });
    }

    // 🔥 ambil detail + join item project
    const details = await ProjectAnalisaDetail.findAll({
      where: { project_analisa_id: id },
      include: [
        {
          model: ProjectItem,
          as: "item",
          attributes: ["id", "nama", "tipe", "satuan", "project_id"]
        },
        {
        model: ProjectAnalisa,
          as: "analisa", // 🔥 penting
          attributes: ["id", "nama"]
        }
      ]
    });

    // 🔥 GROUPING
    let tenaga = [];
    let bahan = [];
    let alat = [];

    details.forEach((d) => {
    if (!d.item) return;
    if (d.item.project_id !== analisa.project_id) return;

    const koef = toNumber(d.koefisien);

    const item = {
        id: d.id,
        item_id: d.item.id,
        nama: d.item.nama,
        tipe: d.item.tipe,
        satuan: d.item.satuan,
        koefisien: koef
    };

    if (d.item.tipe === "TENAGA") {
        tenaga.push(item);
    } else if (d.item.tipe === "BAHAN") {
        bahan.push(item);
    } else {
        alat.push(item);
    }
    });

    // 🔥 RESPONSE FINAL (TAMBAH INFO PROJECT)
    res.json({
      project_id: analisa.project_id, // 🔥 tambahan penting
      analisa_id: analisa.id,
      kode: analisa.kode,
      satuan: analisa.satuan,

      tenaga,
      bahan,
      alat,
      nama: analisa.nama,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createProjectAnalisaDetail = async (req, res) => {
  try {
    const { project_analisa_id, item_id, koefisien } = req.body;
    const item = await ProjectItem.findByPk(item_id);

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const data = await ProjectAnalisaDetail.create({
      project_analisa_id,
      item_id,
      koefisien
    });

    res.status(201).json({
      message: "Berhasil tambah",
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateProjectAnalisaDetail = async (req, res) => {
  try {
    const data = await ProjectAnalisaDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const itemId = req.body.item_id ?? data.item_id;
    const item = await ProjectItem.findByPk(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const updatePayload = { ...req.body };

    await data.update(updatePayload);

    res.json({ message: "Berhasil update", data });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProjectAnalisaDetail = async (req, res) => {
  try {
    const data = await ProjectAnalisaDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({
      message: "Berhasil hapus"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
