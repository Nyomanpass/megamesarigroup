import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import api from "../api";
import { ArrowLeft, CalendarDays, Zap, Save, AlertCircle, FileText } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import Decimal from "decimal.js";

const MotionDiv = motion.div;
const SCHEDULE_DECIMAL_PLACES = 4;
const SCHEDULE_DECIMAL_TOLERANCE = new Decimal("0.0001");

const roundScheduleValue = value =>
  new Decimal(value || 0)
    .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES)
    .toNumber();

const isPlainNumber = value =>
  /^-?\d+(\.\d+)?$/.test(String(value).trim());

const excelColumnToNumber = column => {
  return String(column)
    .toUpperCase()
    .split("")
    .reduce(
      (sum, char) =>
        sum * 26 + char.charCodeAt(0) - 64,
      0
    );
};

export default function SchedulePage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const navigate = useNavigate();
  const [statusMap, setStatusMap] = useState({});
  const [boq, setBoq] = useState([]);
  const [baseBoq, setBaseBoq] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [realData, setRealData] = useState([]);
  const [inputMap, setInputMap] = useState({});
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [mode, setMode] = useState("manual");
  const [error, setError] = useState("");
  const [showAddendumDetail, setShowAddendumDetail] = useState(false);

  const [showBagiRataModal, setShowBagiRataModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const [bagiRataForm, setBagiRataForm] = useState({
    start: 1,
    end: 1
  });


const fetchVersions = async () => {

  try {

    if (!id) return;

    const res =
      await api.get(
        `/project-versions/project/${id}`
      );

    const versionData = res.data.data || [];

    setVersions(versionData);

    // 🔥 DEFAULT VERSION
    if (
      versionData.length > 0
    ) {

      setSelectedVersion(
        versionData[0]
      );
    } else {
      setSelectedVersion(null);
      setError("Version project belum ada. Pastikan data project_versions sudah ikut di-import.");
    }

  } catch (error) {

    console.error(error);
  }
};


  const handleExportTimeSchedule = async () => {
    try {
      const response = await api.get(
        `/export-time-schedule/${id}`,
        {
          params: {
            version_id: selectedVersion?.id
          },
          responseType: "blob", // 🔥 wajib
        }
      );

      // 🔥 download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "time_schedule.xlsx");

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error(error);
      setError("Gagal export Time Schedule");
    }
  };

  const fetchChart = async () => {
    try {
      const res = await api.get(`/daily-plan/weekly-chart/${id}`);
      setRealData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [id]);

  useEffect(() => {
    if (!id || !selectedVersion?.id) return;

    fetchAll();
    fetchChart();
  }, [id, selectedVersion]);


  const fetchAll = async () => {
    try {
      if (!selectedVersion?.id) {
        setSchedule([]);
        return;
      }

      const baseBoqRes = await api.get(`/boq/project/${id}/0`);
      const boqRes = await api.get(`/boq/project/${id}/${selectedVersion?.id || 0}`);
      const weekRes = await api.get(`/schedule/weeks/${id}`);
      const schRes = await api.get(`/schedule/${id}/${selectedVersion?.id}`);
      const weeklyReportRes = await api.get(`/weekly-report/${id}`);
      let scheduleData =
        schRes.data || [];

      if (selectedVersion?.revision > 0) {
        const savedKey =
          `schedule-addendum-saved-v2:${id}:${selectedVersion.id}`;
        const alreadySavedAfterReset =
          window.localStorage.getItem(savedKey) === "1";
        const selectedEffectiveWeek =
          Number(
            selectedVersion.effective_week || 1
          );

        if (!alreadySavedAfterReset) {
          await api.post(
            `/schedule/bulk-save/${id}`,
            {
              version_id:
                selectedVersion.id,
              items: []
            }
          );

          scheduleData =
            scheduleData.filter(
              item =>
                Number(item.minggu_ke) <
                selectedEffectiveWeek
            );
        } else {
          scheduleData =
            scheduleData.filter(
              item =>
                Number(item.minggu_ke) <
                  selectedEffectiveWeek ||
                Number(item.version_id) ===
                  Number(selectedVersion.id)
            );
        }
      }

      setBaseBoq(baseBoqRes.data.data || []);
      setBoq(boqRes.data.data);
      setWeeks(weekRes.data);
      setSchedule(scheduleData);
      setWeeklyReport(weeklyReportRes.data || []);

    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateWeeks = async () => {
    const confirm = window.confirm("Sistem akan membuat daftar minggu otomatis berdasarkan tanggal mulai dan selesai proyek. Lanjutkan?");
    if (!confirm) return;

    setLoadingGenerate(true);
    try {
      await api.post(`/schedule/generate-weeks/${id}`);
      alert("✅ Daftar Minggu Berhasil Dibuat!");
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal Generate Weeks");
    } finally {
      setLoadingGenerate(false);
    }
  };


const submitBagiRata = () => {

   if (!selectedItem) return;

   const start = parseInt(bagiRataForm.start);
   const end = parseInt(bagiRataForm.end);
   const durasi = end - start + 1;

   if (durasi <= 0) {
      alert("Rentang minggu salah!");
      return;
   }

   const addendumInfo =
      getAddendumInfo(selectedItem);

   const totalBobot =
      selectedVersion?.revision > 0
        ? addendumInfo.remaining
        : new Decimal(selectedItem.bobot || 0);

   if (totalBobot.lte(0)) {
      alert("Sisa bobot sudah habis");
      return;
   }

   // 4. Bagi rata basic per minggu
   const base = totalBobot.dividedBy(durasi);

   // 5. Filter schedule lama (pertahankan progres sebelum rentang 'start' s/d 'end')
   let newSchedule = [
      ...schedule.filter(s => 
         !(
            Number(s.boq_id) === Number(selectedItem.id) &&
            Number(s.minggu_ke) >= start &&
            Number(s.minggu_ke) <= end
         )
      )
   ];

   // 6. Push data distribusi baru & tangani selisih angka di minggu terakhir
   let totalSementara = new Decimal(0);

   for (let i = start; i <= end; i++) {
      const remaining = Decimal.max(
        totalBobot.minus(totalSementara),
        new Decimal(0)
      );
      let bobot = new Decimal(
        roundScheduleValue(base)
      );

      // Minggu terakhir menampung sisa selisih pembulatan
      if (i === end) {
         bobot = new Decimal(
           roundScheduleValue(
             remaining
           )
         );
      }

      if (bobot.gt(remaining)) {
        bobot = new Decimal(
          roundScheduleValue(remaining)
        );
      }

      totalSementara = totalSementara.plus(bobot);

      newSchedule.push({
         project_id: id,
         version_id: selectedVersion?.id,
         boq_id: selectedItem.id,
         minggu_ke: i,
         bobot: bobot.toNumber()
      });
   }

   setSchedule(newSchedule);
   setShowBagiRataModal(false);
};


const handleBagiRata = (item) => {
    setSelectedItem(item);

    const effectiveWeek =
    Number(
      selectedVersion?.effective_week || 1
    );

    const startWeek =
      selectedVersion?.revision > 0
      ? effectiveWeek
      : 1;

    setBagiRataForm({
        start: startWeek,
        end: weeks.length
    });
    setShowBagiRataModal(true);
};

const getScheduleBobotByWeek = (boqId, mingguKe) => {
  const data =
    schedule.find(
      s =>
        Number(s.boq_id) === Number(boqId) &&
        Number(s.minggu_ke) === Number(mingguKe)
    );

  return new Decimal(data?.bobot || 0);
};

const calculateFormulaValue = (formula, boqId, sisa) => {
  const totalTarget = new Decimal(
    boq.find(b => b.id === boqId)?.bobot || 0
  );

  let expression = String(formula)
    .trim()
    .replace(/^=/, "")
    .replace(/minggu\s*ke\s*[-–]?\s*(\d+)/gi, 'M$1')
    .replace(/mingguke\s*[-–]?\s*(\d+)/gi, 'M$1')
    .replace(/minggu\s*(\d+)/gi, 'M$1')
    .replace(/\s+/g, "");

  if (!expression) return null;

  const tokens =
    expression.match(/sum|average|avg|min|max|bobot|target|M\d+|W\d+|[SBT]|\d+(?:\.\d+)?|[()+\-*/,:]/gi);

  if (!tokens || tokens.join("").toLowerCase() !== expression.toLowerCase()) {
    return null;
  }

  let position = 0;

  const readToken = () => tokens[position];
  const nextToken = () => tokens[position++];

  const parseFunction = (funcName) => {
    if (nextToken() !== "(") return null;

    const args = [];

    const isWeekRange = () => {
      const t1 = tokens[position];
      const t2 = tokens[position + 1];
      const t3 = tokens[position + 2];
      return t1 && t2 === ":" && t3 && /^[mw]\d+$/i.test(t1) && /^[mw]\d+$/i.test(t3);
    };

    while (readToken() && readToken() !== ")") {
      if (isWeekRange()) {
        const startToken = nextToken();
        nextToken(); // consume ":"
        const endToken = nextToken();

        const startNum = Number(startToken.replace(/^[mw]/i, ""));
        const endNum = Number(endToken.replace(/^[mw]/i, ""));

        const minWeek = Math.min(startNum, endNum);
        const maxWeek = Math.max(startNum, endNum);

        for (let w = minWeek; w <= maxWeek; w++) {
          args.push(getScheduleBobotByWeek(boqId, w));
        }
      } else {
        const exprValue = parseExpression();
        if (exprValue === null) return null;
        args.push(exprValue);
      }

      if (readToken() === ",") {
        nextToken(); // consume ","
      } else if (readToken() !== ")") {
        return null;
      }
    }

    if (nextToken() !== ")") return null;

    if (funcName === "sum") {
      return args.reduce((s, val) => s.plus(val), new Decimal(0));
    }
    if (funcName === "average" || funcName === "avg") {
      if (args.length === 0) return new Decimal(0);
      const sum = args.reduce((s, val) => s.plus(val), new Decimal(0));
      return sum.dividedBy(args.length);
    }
    if (funcName === "min") {
      if (args.length === 0) return new Decimal(0);
      return Decimal.min(...args);
    }
    if (funcName === "max") {
      if (args.length === 0) return new Decimal(0);
      return Decimal.max(...args);
    }

    return null;
  };

  const parseFactor = () => {
    const token = nextToken();

    if (!token) return null;

    if (token === "-") {
      const value = parseFactor();
      return value ? value.negated() : null;
    }

    if (token === "+") {
      return parseFactor();
    }

    if (token === "(") {
      const value = parseExpression();

      if (nextToken() !== ")") return null;

      return value;
    }

    const lowerToken = token.toLowerCase();
    if (["sum", "average", "avg", "min", "max"].includes(lowerToken)) {
      return parseFunction(lowerToken);
    }

    if (["bobot", "target", "b", "t"].includes(lowerToken)) {
      return totalTarget;
    }

    if (lowerToken === "s") {
      return sisa;
    }

    if (/^[mw]\d+$/i.test(token)) {
      return getScheduleBobotByWeek(
        boqId,
        Number(token.replace(/^[mw]/i, ""))
      );
    }

    if (isPlainNumber(token)) {
      return new Decimal(token);
    }

    return null;
  };

  const parseTerm = () => {
    let value = parseFactor();

    if (!value) return null;

    while (readToken() === "*" || readToken() === "/") {
      const operator = nextToken();
      const right = parseFactor();

      if (!right) return null;
      if (operator === "/" && right.isZero()) return null;

      value =
        operator === "*"
          ? value.times(right)
          : value.dividedBy(right);
    }

    return value;
  };

  function parseExpression() {
    let value = parseTerm();

    if (!value) return null;

    while (readToken() === "+" || readToken() === "-") {
      const operator = nextToken();
      const right = parseTerm();

      if (!right) return null;

      value =
        operator === "+"
          ? value.plus(right)
          : value.minus(right);
    }

    return value;
  }

  const result = parseExpression();

  if (!result || position !== tokens.length || !result.isFinite()) {
    return null;
  }

  return result.toDecimalPlaces(SCHEDULE_DECIMAL_PLACES).toNumber();
};

const normalizeScheduleNumberInput = value =>
  typeof value === "string"
    ? value.trim().replace(",", ".")
    : value;

const formatScheduleEditValue = value => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const decimalValue = new Decimal(value || 0)
    .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES)
    .toFixed(SCHEDULE_DECIMAL_PLACES);

  return decimalValue
    .replace(/\.?0+$/, "");
};


const handleSingleCellChange = (
  boqId,
  mingguKe,
  value
) => {
  const isAddendumSchedule =
    selectedVersion?.revision > 0;
  const selectedEffectiveWeek =
    Number(
      selectedVersion?.effective_week || 1
    );

  if (
    isAddendumSchedule &&
    Number(mingguKe) < selectedEffectiveWeek
  ) {
    return null;
  }

  // =========================
  // TARGET
  // =========================
  const totalTarget =
    new Decimal(
      boq.find(
        b => b.id === boqId
      )?.bobot || 0
    );

  const selectedBoqItem =
    boq.find(
      b =>
        Number(b.id) === Number(boqId)
    );

  const scheduleTarget =
    isAddendumSchedule && selectedBoqItem
      ? getAddendumInfo(selectedBoqItem)
          .remaining
      : totalTarget;

  const isEditableScheduleWeek = item =>
    !isAddendumSchedule ||
    (
      Number(item.minggu_ke) >=
        selectedEffectiveWeek &&
      Number(item.version_id) ===
        Number(selectedVersion?.id)
    );

  // =========================
  // TOTAL EXISTING
  // =========================
  const totalExisting =
    schedule
      .filter(
        s =>
          Number(s.boq_id) === Number(boqId) &&
          Number(s.minggu_ke) !== Number(mingguKe) &&
          isEditableScheduleWeek(s)
      )
      .reduce(

        (sum, s) =>

          sum.plus(
            new Decimal(
              s.bobot || 0
            )
          ),

        new Decimal(0)

      );

  // =========================
  // SISA
  // =========================
  const sisa =
    scheduleTarget.minus(
      totalExisting
    );

  const divideTarget =
    scheduleTarget;

    if (
    typeof value === "string" &&
    value.trim().toLowerCase() === "s"
  ) {

   value =
    sisa
      .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES)
      .toNumber();
    }

    if (
  typeof value === "string" &&
  value.trim().toLowerCase().startsWith("s/")
) {

  const pembagiText =
    value
      .toLowerCase()
      .replace("s/", "")
      .trim()
      .replace(",", ".");

  const pembagi =
    new Decimal(
      pembagiText || 0
    );

  if (
    pembagi.isFinite() &&
    pembagi.gt(0)
  ) {

    value =
      sisa
        .dividedBy(pembagi)
        .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES)
        .toNumber();
  }
}

  // =========================
  // SUPPORT =1 =2 =3
  // COPY DARI MINGGU / RUMUS
  // =========================
  if (
    typeof value === "string" &&
    value.startsWith("=")
  ) {

    const formulaBody =
      value.replace("=", "").trim();

    if (isPlainNumber(formulaBody)) {

      const mingguSource =
        Number(formulaBody);

      if (!isNaN(mingguSource)) {

        const sourceData =
          schedule.find(
            s =>
              Number(s.boq_id) === Number(boqId) &&
              Number(s.minggu_ke) === Number(mingguSource) &&
              (
                !isAddendumSchedule ||
                Number(mingguSource) < selectedEffectiveWeek ||
                Number(s.version_id) ===
                  Number(selectedVersion?.id)
              )
          );

        if (sourceData) {

          value =
            roundScheduleValue(
              sourceData.bobot || 0
            );
        }
      }

    } else {

      const result =
        calculateFormulaValue(
          value,
          boqId,
          sisa
        );

      if (result !== null) {
        value = result;
      }
    }
  }

  // =========================
  // SUPPORT /2 /3 /4 /1.5 /1,5
  // MC0: bagi bobot awal. Addendum: bagi sisa target addendum.
  // =========================
  if (
    typeof value === "string" &&
    value.startsWith("/")
  ) {

    const pembagiText =
      value
        .replace("/", "")
        .trim()
        .replace(",", ".");

    const pembagi =
      new Decimal(
        pembagiText || 0
      );

    if (
      pembagi.isFinite() &&
      pembagi.gt(0)
    ) {

      value =
        divideTarget
          .dividedBy(pembagi)
          .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES)
          .toNumber();
    }
  }

  // =========================
  // INPUT VALUE
  // =========================
  const inputValue =
    parseFloat(
      normalizeScheduleNumberInput(value)
    );

  if (
    isNaN(inputValue) ||
    inputValue < 0
  ) return null;

  let newSchedule = [...schedule];

  const index =
    newSchedule.findIndex(
      s =>
        Number(s.boq_id) === Number(boqId) &&
        Number(s.minggu_ke) === Number(mingguKe)
    );

  // =========================
  // UPDATE / INSERT
  // =========================
  if (index >= 0) {

    newSchedule[index].bobot =
      roundScheduleValue(inputValue);
    newSchedule[index].version_id =
      selectedVersion?.id;

  } else {

    newSchedule.push({

      project_id: id,

      version_id:
        selectedVersion?.id,

      boq_id: boqId,

      minggu_ke: mingguKe,

      bobot: roundScheduleValue(inputValue)
    });
  }

  // =========================
  // HAPUS JIKA 0
  // =========================
  newSchedule = newSchedule.filter(
    s =>
      !(
        s.boq_id === boqId &&
        Number(s.bobot) === 0
      )
  );

  // =========================
  // 🔵 MODE AUTO
  // =========================
  if (mode === "auto") {

    let itemWeeks =
      newSchedule.filter(
        s =>
          s.boq_id === boqId &&
          isEditableScheduleWeek(s)
      );

    let total =
      itemWeeks.reduce(
        (sum, s) =>
          sum + Number(s.bobot),
        0
      );

    let selisih =
      Number(
        (
          total - scheduleTarget
        ).toFixed(SCHEDULE_DECIMAL_PLACES)
      );

    if (selisih !== 0) {

      const others =
        itemWeeks.filter(
          s =>
            s.minggu_ke !== mingguKe
        );

      if (others.length > 0) {

        const totalOthers =
          others.reduce(
            (sum, s) =>
              sum + Number(s.bobot),
            0
          );

        for (let w of others) {

          if (totalOthers === 0)
            break;

          const proporsi =
            w.bobot / totalOthers;

          const adjust =
            selisih * proporsi;

          w.bobot =
            roundScheduleValue(
              w.bobot - adjust
            );

          if (w.bobot < 0)
            w.bobot = 0;
        }
      }
    }

    // =========================
    // FIX TOTAL
    // =========================
    let fixTotal =
      itemWeeks.reduce(
        (sum, s) =>
          sum + Number(s.bobot),
        0
      );

    let diff =
      Number(
        (
          fixTotal - scheduleTarget
        ).toFixed(SCHEDULE_DECIMAL_PLACES)
      );

    if (
      diff !== 0 &&
      itemWeeks.length > 0
    ) {

      let last =
        itemWeeks[
          itemWeeks.length - 1
        ];

      last.bobot =
        roundScheduleValue(
          last.bobot - diff
        );
    }
  }

  // =========================
  // STATUS
  // =========================
  const itemWeeksFinal =
    newSchedule.filter(
      s =>
        s.boq_id === boqId &&
        isEditableScheduleWeek(s)
    );

  const totalFinal =
  itemWeeksFinal.reduce(

    (sum, s) =>

      sum.plus(
        new Decimal(
          s.bobot || 0
        )
      ),

    new Decimal(0)

  );

 const totalRounded =
  totalFinal
    .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES)
    .toNumber();

  const tolerance =
  SCHEDULE_DECIMAL_TOLERANCE;

    const diff =
      totalFinal
        .minus(scheduleTarget)
        .abs();

    const status =
      diff.lte(tolerance)
        ? "pas"
        : totalFinal.gt(scheduleTarget)
          ? "lebih"
          : "kurang";

  // =========================
  // STATUS MAP
  // =========================
  setStatusMap(prev => ({

    ...prev,

    [boqId]: {

      total: totalRounded,

      target: scheduleTarget,

      status
    }
  }));

  setSchedule([...newSchedule]);

  return inputValue;
};


 const handleSaveSchedule = async () => {
  try {
    if (schedule.length === 0) {
      return alert("Jadwal masih kosong!");
    }

    const normalizeItemsTotal = (
      items,
      target = 100
    ) => {
      const normalized =
        items.map(item => ({
          ...item,
          bobot: roundScheduleValue(item.bobot || 0)
        }));

      const total =
        normalized.reduce(
          (sum, item) =>
            sum.plus(item.bobot || 0),
          new Decimal(0)
        );

      const diff =
        total.minus(target);

      if (
        diff.abs().gt(new Decimal("0.05"))
      ) {
        return normalized;
      }

      const adjustIndex =
        [...normalized]
          .map((item, index) => ({
            ...item,
            index
          }))
          .reverse()
          .find(item =>
            Number(item.bobot || 0) > 0
          )
          ?.index;

      if (
        adjustIndex === undefined
      ) {
        return normalized;
      }

      normalized[adjustIndex].bobot =
        roundScheduleValue(
          Decimal.max(
          new Decimal(normalized[adjustIndex].bobot || 0)
            .minus(diff),
          new Decimal(0)
        )
        );

      return normalized;
    };

    const effectiveWeek =
      Number(selectedVersion?.effective_week || 1);

    let itemsToSave =
      selectedVersion?.revision > 0
        ? schedule.filter(item =>
            Number(item.version_id) === Number(selectedVersion.id) &&
            Number(item.minggu_ke) >= effectiveWeek
          )
        : schedule;

    if (!(selectedVersion?.revision > 0)) {
      itemsToSave =
        normalizeItemsTotal(
          itemsToSave,
          100
        );
    }

    itemsToSave =
      itemsToSave.map(item => ({
        ...item,
        bobot: roundScheduleValue(item.bobot || 0)
      }));

    await api.post(
      `/schedule/bulk-save/${id}`,
      {
        version_id: selectedVersion?.id,
        items: itemsToSave
      }
    );

    if (selectedVersion?.revision > 0) {
      window.localStorage.setItem(
        `schedule-addendum-saved-v2:${id}:${selectedVersion.id}`,
        "1"
      );
    }

    alert("✅ Jadwal Berhasil Disimpan Permanen!");
    fetchAll();

  } catch (err) {
    console.error(err);
    alert("Gagal simpan ke database: " + err.message);
  }
};

  const handleResetAddendumSchedule = async () => {
    if (!(selectedVersion?.revision > 0)) {
      return;
    }

    const confirmReset =
      window.confirm(
        `Kosongkan semua jadwal ${selectedVersionLabel} mulai minggu ${selectedVersion.effective_week}?`
      );

    if (!confirmReset) {
      return;
    }

    try {
      await api.post(
        `/schedule/bulk-save/${id}`,
        {
          version_id:
            selectedVersion.id,
          items: []
        }
      );

      window.localStorage.removeItem(
        `schedule-addendum-saved-v2:${id}:${selectedVersion.id}`
      );

      setSchedule(prev =>
        prev.filter(
          item =>
            Number(item.version_id) !==
            Number(selectedVersion.id)
        )
      );

      setStatusMap({});
      alert(`✅ Jadwal ${selectedVersionLabel} sudah dikosongkan.`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Gagal kosongkan jadwal addendum: " + err.message);
    }
  };

  const rencanaPerMinggu = weeks.map(w => {

    return schedule
      .filter(
        s =>
          Number(s.minggu_ke) ===
          Number(w.minggu_ke)
      )
    .reduce(

        (sum, s) =>

          sum.plus(
            new Decimal(
              s.bobot || 0
            )
          ),

        new Decimal(0)

      )
      .toNumber();
  });

  let akumulasi = new Decimal(0);
  rencanaPerMinggu.forEach(nilai => {
    akumulasi =
      akumulasi.plus(nilai);
  });

// =========================
// REALISASI FISIK
// =========================

const realPerMinggu =
weeks.map((w)=>{

   const real =
   realData.find(

      r=>
      Number(
         r.minggu_ke
      ) === Number(
         w.minggu_ke
      )

   );

   return Number(
      real?.real || 0
   );

});

// =========================
// KOMULATIF REAL
// =========================

const realKomulatif =
weeks.map((w)=>{

   const real =
   realData.find(

      r=>
      Number(
         r.minggu_ke
      ) === Number(
         w.minggu_ke
      )

   );

   return Number(
      real?.kum_real || 0
   );

});



  let scheduleTotal =
    akumulasi;
  let isComplete =
    scheduleTotal > 99.9 &&
    scheduleTotal < 100.1;

  const boqMap = {};
  boq.forEach(item => {
    boqMap[item.id] = { ...item, children: [] };
  });

  const baseBoqMap = {};
  baseBoq.forEach(item => {
    baseBoqMap[item.id] = item;
  });

  const getBeforeEffectiveProgress = (item) => {
    if (!(selectedVersion?.revision > 0)) {
      return new Decimal(0);
    }

    const previousWeek =
      effectiveWeek - 1;

    if (previousWeek <= 0) {
      return new Decimal(0);
    }

    const report =
      weeklyReport.find(
        item =>
          Number(item.minggu_ke) === Number(previousWeek)
      );

    const progressItem =
      report?.data?.find(
        progress =>
          Number(progress.boq_id) ===
          Number(item.boq_item_id || item.id)
      );

    const progressVolume =
      new Decimal(
        progressItem?.sd_ini || 0
      );
    const mcVolume =
      new Decimal(item.volume || 0);
    const mcBobot =
      new Decimal(item.bobot || 0);

    if (
      mcVolume.lte(0) ||
      progressVolume.lte(0)
    ) {
      return new Decimal(0);
    }

    const progressRatio =
      Decimal.min(
        progressVolume.dividedBy(mcVolume),
        new Decimal(1)
      );

    return progressRatio
      .times(mcBobot)
      .toDecimalPlaces(SCHEDULE_DECIMAL_PLACES);
  };

  const getRawAddendumRemaining = (item) => {
    const mcBobot =
      new Decimal(item.bobot || 0);
    const beforeProgress =
      getBeforeEffectiveProgress(item);

    return Decimal.max(
      mcBobot.minus(beforeProgress),
      new Decimal(0)
    );
  };

  const getAddendumSeed = () => {
    if (!(selectedVersion?.revision > 0)) {
      return new Decimal(0);
    }

    const previousWeek =
      effectiveWeek - 1;

    if (previousWeek <= 0) {
      return new Decimal(0);
    }

    const report =
      weeklyReport.find(
        item =>
          Number(item.minggu_ke) ===
          Number(previousWeek)
      );

    return new Decimal(
      report?.real_kumulatif || 0
    );
  };

  const getAddendumRemainingFactor = () => {
    if (!(selectedVersion?.revision > 0)) {
      return new Decimal(1);
    }

    const rawRemainingTotal =
      boq
        .filter(item => item.tipe === "item")
        .reduce(
          (sum, item) =>
            sum.plus(
              getRawAddendumRemaining(item)
            ),
          new Decimal(0)
        );

    if (rawRemainingTotal.lte(0)) {
      return new Decimal(1);
    }

    const targetRemaining =
      Decimal.max(
        new Decimal(100).minus(
          getAddendumSeed()
        ),
        new Decimal(0)
      );

    return targetRemaining
      .dividedBy(rawRemainingTotal);
  };

  const getAddendumInfo = (item) => {
    const baseItem =
      baseBoqMap[item.id] || {};

    const mc0Volume =
      Number(baseItem.volume || 0);

    const mc0Bobot =
      new Decimal(baseItem.bobot || 0);

    const mcVolume =
      Number(item.volume || 0);

    const mcBobot =
      new Decimal(item.bobot || 0);

    const beforeProgress =
      getBeforeEffectiveProgress(item);

    const rawRemaining =
      getRawAddendumRemaining(item);

    const remaining =
      rawRemaining.toDecimalPlaces(SCHEDULE_DECIMAL_PLACES);

    return {
      mc0Volume,
      mc0Bobot,
      mcVolume,
      mcBobot,
      beforeProgress,
      rawRemaining,
      remaining
    };
  };

  const tree = [];

  boq.forEach(item => {
      if (item.parent_id) {
        boqMap[item.parent_id]?.children.push(boqMap[item.id]);
      } else {
        tree.push(boqMap[item.id]);
      }
  });

  const effectiveWeek = Number(selectedVersion?.effective_week || 1);

  const activeVersionChain =
    versions
      .filter(
        v =>
          selectedVersion &&
          Number(v.revision || 0) <=
            Number(selectedVersion.revision || 0)
      )
      .sort(
        (a, b) =>
          Number(a.revision || 0) -
          Number(b.revision || 0)
      );

  const activeAddendumVersions =
    activeVersionChain.filter(
      v => Number(v.revision || 0) > 0
    );

  const firstAddendumWeek =
    activeAddendumVersions.length > 0
      ? Number(
          activeAddendumVersions[0]
            .effective_week || 1
        )
      : null;

const displayWeeks =
weeks.flatMap((w)=>{

   const arr=[];

   const addendumMarkers =
   activeAddendumVersions.filter(
      version =>
      Number(version.effective_week) ===
      Number(w.minggu_ke)
   );

   // 🔥 tambahkan marker MC sesuai rantai addendum
   addendumMarkers.forEach((version)=>{

      arr.push({

         id:`mc-${version.id}-${w.id}`,
         isMC:true,
         code:version.code,
         revision:version.revision,
         versionId:version.id,
         effectiveWeek:version.effective_week,
         description:version.description

      });

   });

   // 🔥 baru week normal
   arr.push(w);

   return arr;

});

  const selectedVersionLabel =
    selectedVersion?.revision > 0
      ? selectedVersion.code
      : "MC0";

  const selectedVersionDescription =
    selectedVersion?.revision > 0
      ? `Addendum aktif mulai minggu ke-${selectedVersion.effective_week || "-"}`
      : "Baseline / kontrak awal";

  const formatFooterNumber = value => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    return new Decimal(value || 0)
      .toDecimalPlaces(3, Decimal.ROUND_DOWN)
      .toFixed(3);
  };

  const getWeekIndex = mingguKe =>
    weeks.findIndex(
      week =>
        Number(week.minggu_ke) ===
        Number(mingguKe)
    );

  const getScheduleTotalByWeek = mingguKe =>
    schedule
      .filter(item => {
        const weekNumber = Number(mingguKe);
        const itemWeek = Number(item.minggu_ke);

        if (
          selectedVersion?.revision > 0 &&
          weekNumber >= Number(selectedVersion.effective_week || 1)
        ) {
          return (
            itemWeek === weekNumber &&
            Number(item.version_id) === Number(selectedVersion.id)
          );
        }

        return itemWeek === weekNumber;
      })
      .reduce(
        (sum, item) =>
          sum.plus(new Decimal(item.bobot || 0)),
        new Decimal(0)
  );

  const getRealCumulativeAtWeek = mingguKe => {
    const index =
      getWeekIndex(mingguKe);

    if (index < 0) {
      return new Decimal(0);
    }

    return new Decimal(
      realKomulatif[index] || 0
    );
  };

  const getAddendumRebaselineSeed = startWeek => {
    const previousProgress =
      getRealCumulativeAtWeek(startWeek - 1);
    const startWeekReal =
      realData.find(
        item =>
          Number(item.minggu_ke) ===
          Number(startWeek)
      );
    const addendumAdjustment =
      new Decimal(
        startWeekReal?.penyesuaian_adendum || 0
      );

    return Decimal.max(
      previousProgress.plus(addendumAdjustment),
      new Decimal(0)
    );
  };

  const getAddendumFooterMeta = (
    version,
    index
  ) => {
    const startWeek =
      Number(version.effective_week || 1);
    const nextVersion =
      activeAddendumVersions[index + 1];
    const endWeek =
      nextVersion
        ? Number(nextVersion.effective_week || 1) - 1
        : Infinity;
    const seed =
      getAddendumRebaselineSeed(startWeek);
    const planWeeks =
      weeks
        .filter(
          week =>
            Number(week.minggu_ke) >= startWeek &&
            Number(week.minggu_ke) <= endWeek
        )
        .map(week => Number(week.minggu_ke));
    const rawTotal =
      planWeeks.reduce(
        (sum, mingguKe) =>
          sum.plus(
            getScheduleTotalByWeek(mingguKe)
          ),
        new Decimal(0)
      );
    const remainingTarget =
      rawTotal;
    const factor =
      new Decimal(1);

    return {
      version,
      startWeek,
      endWeek,
      seed,
      planWeeks,
      rawTotal,
      remainingTarget,
      factor
    };
  };

  const getNormalizedAddendumWeek =
    (meta, mingguKe) => {
      const weekNumber =
        Number(mingguKe);

      if (!meta.planWeeks.includes(weekNumber)) {
        return new Decimal(0);
      }

      return getScheduleTotalByWeek(weekNumber);
    };

  const getBaselinePlanWeekly = mingguKe => {
    if (
      firstAddendumWeek &&
      Number(mingguKe) >= firstAddendumWeek
    ) {
      return null;
    }

    return getScheduleTotalByWeek(mingguKe);
  };

  const getBaselinePlanCumulative = mingguKe => {
    if (
      firstAddendumWeek &&
      Number(mingguKe) >= firstAddendumWeek
    ) {
      return null;
    }

    return weeks
      .filter(
        week =>
          Number(week.minggu_ke) <=
          Number(mingguKe)
      )
      .reduce(
        (sum, week) =>
          sum.plus(
            getScheduleTotalByWeek(
              week.minggu_ke
            )
          ),
        new Decimal(0)
      );
  };

  const getAddendumPlanWeekly = (
    meta,
    mingguKe
  ) => {
    if (
      Number(mingguKe) < meta.startWeek ||
      Number(mingguKe) > meta.endWeek
    ) {
      return null;
    }

    return getNormalizedAddendumWeek(
      meta,
      mingguKe
    );
  };

  const getAddendumPlanCumulative = (
    meta,
    mingguKe
  ) => {
    if (
      Number(mingguKe) < meta.startWeek ||
      Number(mingguKe) > meta.endWeek
    ) {
      return null;
    }

    const total =
      meta.planWeeks
        .filter(
          week =>
            Number(week) <=
            Number(mingguKe)
        )
        .reduce(
          (sum, week) =>
            sum.plus(
              getNormalizedAddendumWeek(
                meta,
                week
              )
            ),
          new Decimal(0)
        );

    return Decimal.min(
      meta.seed.plus(total),
      new Decimal(100)
    );
  };

  const getActivePlanCumulative =
    mingguKe => {
      const weekNumber =
        Number(mingguKe);

      if (
        activeAddendumVersions.length === 0 ||
        weekNumber < firstAddendumWeek
      ) {
        return getBaselinePlanCumulative(
          mingguKe
        );
      }

      const activeMeta =
        activeAddendumVersions
          .map(getAddendumFooterMeta)
          .find(
            meta =>
              weekNumber >= meta.startWeek &&
              weekNumber <= meta.endWeek
          );

      return activeMeta
        ? getAddendumPlanCumulative(
            activeMeta,
            mingguKe
          )
        : null;
    };

  const chartData = weeks.map((w) => {

    const real =
      realData.find(
        r => Number(r.minggu_ke) === Number(w.minggu_ke)
      );

    const target =
      getActivePlanCumulative(w.minggu_ke);

    return {

      name: `M${w.minggu_ke}`,

      target: Number(
        target ?? 0
      ),

      real: Number(
        real?.kum_real || 0
      )
    };
  });

  if (
    selectedVersion?.revision > 0 &&
    weeks.length > 0
  ) {
    const lastWeek =
      weeks[weeks.length - 1];
    const finalPlan =
      getActivePlanCumulative(
        lastWeek.minggu_ke
      );

    if (finalPlan !== null) {
      scheduleTotal =
        new Decimal(finalPlan);
      isComplete =
        scheduleTotal.gt(99.9) &&
        scheduleTotal.lt(100.1);
    }
  }

  const renderFooterWeekCells =
    getValue => {
      return displayWeeks.map((w, idx) => {
        if (w.isMC) {
          return (
            <td
              key={`footer-mc-${w.id}-${idx}`}
              className="bg-red-50 border-r-2 border-red-500"
            >
              {formatFooterNumber(
                getValue(w)
              )}
            </td>
          );
        }

        const value =
          getValue(w);

        return (
          <td
            key={`footer-week-${w.id}-${idx}`}
            className="p-3 border-r border-gray-200 text-center font-mono font-bold text-xs"
          >
            {formatFooterNumber(value)}
          </td>
        );
      });
    };

  const renderFooterRow = ({
    key,
    label,
    subLabel,
    getValue,
    rowClassName = "",
    labelClassName = "",
    subLabelClassName = ""
  }) => (
    <tr
      key={key}
      className={rowClassName}
    >
      <td
        className={`p-4 border-r border-gray-200 text-right uppercase text-xs font-black sticky left-0 ${labelClassName}`}
      >
        {label}
      </td>
      {selectedVersion?.revision > 0 &&
        showAddendumDetail && (
          <td
            colSpan={5}
            className="border-r border-gray-200 bg-gray-50"
          />
        )}
      <td
        className={`p-3 border-r border-gray-200 text-left uppercase text-[11px] font-black whitespace-nowrap ${subLabelClassName}`}
      >
        {subLabel}
      </td>
      {renderFooterWeekCells(
        week => getValue(week)
      )}
    </tr>
  );

  const footerPlanRows = [
    {
      key: "baseline-weekly",
      label: "Rencana Fisik Pekerjaan",
      subLabel: "Jumlah Per-Minggu",
      getValue: week =>
        week.isMC
          ? null
          : getBaselinePlanWeekly(
              week.minggu_ke
            ),
      rowClassName:
        "border-t-2 border-gray-300 bg-white",
      labelClassName:
        "bg-white text-gray-800",
      subLabelClassName:
        "bg-white text-gray-800"
    },
    {
      key: "baseline-cumulative",
      label: "",
      subLabel:
        "Jumlah Komulatif Per-Minggu",
      getValue: week =>
        week.isMC
          ? null
          : getBaselinePlanCumulative(
              week.minggu_ke
            ),
      rowClassName:
        "border-b-2 border-gray-300 bg-white",
      labelClassName:
        "bg-white text-gray-800",
      subLabelClassName:
        "bg-white text-gray-800"
    },
    ...activeAddendumVersions.flatMap(
      (version, index) => {
        const meta =
          getAddendumFooterMeta(
            version,
            index
          );
        const revisionLabel =
          version.code ||
          `MC${version.revision}`;

        return [
          {
            key: `add-${version.id}-weekly`,
            label: `Rencana Fisik Pekerjaan ${revisionLabel}`,
            subLabel: "Jumlah Per-Minggu",
            getValue: week =>
              week.isMC
                ? null
                : getAddendumPlanWeekly(
                    meta,
                    week.minggu_ke
                  ),
            rowClassName:
              "border-t-2 border-orange-300 bg-orange-50/30",
            labelClassName:
              "bg-orange-50 text-orange-800",
            subLabelClassName:
              "bg-orange-50 text-orange-800"
          },
          {
            key: `add-${version.id}-cumulative`,
            label: "",
            subLabel:
              "Jumlah Komulatif Per-Minggu",
            getValue: week => {
              if (
                week.isMC &&
                Number(week.effectiveWeek) ===
                  meta.startWeek
              ) {
                return meta.seed;
              }

              return week.isMC
                ? null
                : getAddendumPlanCumulative(
                    meta,
                    week.minggu_ke
                  );
            },
            rowClassName:
              "border-b-2 border-orange-300 bg-orange-50/30",
            labelClassName:
              "bg-orange-50 text-orange-800",
            subLabelClassName:
              "bg-orange-50 text-orange-800"
          }
        ];
      }
    )
  ];

  const renderRows = (items, level = 0) => {
    return items.map(item => {
      const tableExtraColumns =
        selectedVersion?.revision > 0 && showAddendumDetail
          ? 5
          : 0;

      // 🔷 HEADER
      if (item.tipe === "header") {
        return (
          <React.Fragment key={item.id}>
            <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
              <td colSpan={displayWeeks.length + 2 + tableExtraColumns} className="p-4 font-bold tracking-wide text-sm">
                🔷 {item.kode} - {item.uraian}
              </td>
            </tr>
            {renderRows(item.children, level + 1)}
          </React.Fragment>
        );
      }

      // 🔹 SUBHEADER
      if (item.tipe === "subheader") {
        return (
          <React.Fragment key={item.id}>
            <tr className="bg-slate-100">
              <td colSpan={displayWeeks.length + 2 + tableExtraColumns} className="p-3 pl-6 font-semibold text-gray-700 text-xs">
                🔹 {item.kode} - {item.uraian}
              </td>
            </tr>
            {renderRows(item.children, level + 1)}
          </React.Fragment>
        );
      }

      // 📌 ITEM
      const bobotResmi = Number(Number(item.bobot || 0).toFixed(3));
      const addendumInfo =
        selectedVersion?.revision > 0
          ? getAddendumInfo(item)
          : null;

      return (
        <tr key={item.id} className="group hover:bg-blue-50/40 transition-all">

          {/* URAIAN */}
          <td
            className="p-3 border-b border-r border-gray-100 sticky left-0 bg-white z-10"
            style={{ paddingLeft: `${level * 20 + 16}px` }}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-700">
                {item.uraian}
              </span>

              <button
                onClick={() => handleBagiRata(item)}
                className="opacity-0 group-hover:opacity-100 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition-all"
              >
                AUTO
              </button>
            </div>

            {/* STATUS */}
            <div className="text-[10px] mt-1">
              {(() => {
                const statusData = statusMap[item.id];
                if (!statusData) return null;

                const selisih = Number(
                  Math.abs(statusData.target - statusData.total).toFixed(3)
                );

                if (statusData.status === "kurang") {
                  return (
                    <span className="text-orange-500 font-semibold">
                      Kurang {selisih}
                    </span>
                  );
                }

                if (statusData.status === "lebih") {
                  return (
                    <span className="text-red-500 font-semibold">
                      Lebih {selisih}
                    </span>
                  );
                }

                return (
                  <span className="text-green-600 font-semibold">
                    ✔ Pas
                  </span>
                );
              })()}
            </div>
          </td>

          {selectedVersion?.revision > 0 && showAddendumDetail && (
            <>
              <td className="min-w-[80px] p-2 border-b border-r bg-slate-50 text-center font-mono text-[11px] text-slate-700">
                {Number(addendumInfo?.mc0Volume || 0).toFixed(3)}
              </td>
              <td className="min-w-[80px] p-2 border-b border-r bg-slate-50 text-center font-mono text-[11px] text-slate-700">
                {addendumInfo?.mc0Bobot.toDecimalPlaces(3).toFixed(3)}
              </td>
              <td className="min-w-[80px] p-2 border-b border-r bg-orange-50 text-center font-mono text-[11px] text-orange-700 font-bold">
                {Number(addendumInfo?.mcVolume || 0).toFixed(3)}
              </td>
              <td className="min-w-[80px] p-2 border-b border-r bg-orange-50 text-center font-mono text-[11px] text-orange-700 font-bold">
                {addendumInfo?.mcBobot.toDecimalPlaces(3).toFixed(3)}
              </td>
              <td className="min-w-[95px] p-2 border-b border-r bg-emerald-50 text-center font-mono text-[11px] text-emerald-700 font-bold">
                {addendumInfo?.beforeProgress.toDecimalPlaces(3).toFixed(3)}
              </td>
            </>
          )}

          {/* BOBOT */}
            <td className="p-2 border-b border-r border-gray-100 text-center bg-amber-50 text-amber-700 font-mono text-xs font-bold">
              {bobotResmi.toFixed(3)}
            </td>

            {displayWeeks.map((w)=>{

              // 🔥 kalau kolom MC
              if(w.isMC){
                  const isSelectedVersionMarker =
                    Number(w.versionId) ===
                    Number(selectedVersion?.id);

                  return(
                    <td
                      key={`mc-sisa-${item.id}-${w.id}`}
                      className="min-w-[85px] p-2 border-b border-r-2 border-red-500 bg-red-50 text-center font-mono text-[11px] text-red-700 font-black"
                    >
                      {isSelectedVersionMarker
                        ? addendumInfo?.remaining.toDecimalPlaces(3).toFixed(3)
                        : ""}
                    </td>

                  )

              }

              // 🔥 WEEK NORMAL
              const effectiveWeek =
              Number(
                  selectedVersion?.effective_week || 1
              );

              const isAddendumEditableWeek =
              selectedVersion?.revision > 0 &&
              Number(w.minggu_ke) >= effectiveWeek;

              const cellData =
              schedule.find(
                  (s)=>
                  Number(s.boq_id)===Number(item.id)
                  &&
                  Number(s.minggu_ke)===Number(w.minggu_ke)
                  &&
                  (
                    !isAddendumEditableWeek ||
                    Number(s.version_id) ===
                    Number(selectedVersion?.id)
                  )
              );

              const val =
              cellData
              ? cellData.bobot
              : "";

              const isActive =
              val !== "";

              const isLocked =
              selectedVersion?.revision > 0 &&
              Number(w.minggu_ke) < effectiveWeek;

              return(

                  <td
                    key={`week-${item.id}-${w.id}`}
                    className="
                    border-b
                    border-r
                    border-gray-100
                    p-1
                    relative
                    transition-all
                    "
                  >

                    <div
                    className={`
                        absolute
                        inset-1
                        rounded-md

                        ${
                        isActive
                        ? "bg-blue-200/30 border border-blue-300 shadow-sm"
                        : "bg-transparent"
                        }
                    `}
                    />

                    <input
                    type="text"
                    disabled={isLocked}
                    value={
                        inputMap[
                        `${item.id}-${w.minggu_ke}`
                        ] ??
                        (
                        val !== ""
                        ? Number(val).toFixed(3)
                        : ""
                        )
                    }

                    placeholder="0.000"

                    onFocus={()=>{
                        if (isLocked || val === "") {
                          return;
                        }

                        setInputMap(prev=>({
                          ...prev,
                          [`${item.id}-${w.minggu_ke}`]:
                            formatScheduleEditValue(val)
                        }));
                    }}

                    onChange={(e)=>{

                        const v=e.target.value;
                        const trimmedValue =
                          v.trim();
                        const isCommandLikeInput =
                          /^s/i.test(trimmedValue) ||
                          /^\//.test(trimmedValue) ||
                          /^=/.test(trimmedValue);

                        setInputMap(prev=>({

                        ...prev,

                        [`${item.id}-${w.minggu_ke}`]:
                        v

                        }));

                        if (isCommandLikeInput) {
                          return;
                        }

                        const calculatedValue =
                        handleSingleCellChange(
                        item.id,
                        w.minggu_ke,
                        v
                        );

                    }}

                    onBlur={()=>{

                        const inputKey =
                          `${item.id}-${w.minggu_ke}`;
                        const pendingValue =
                          inputMap[inputKey];

                        if (
                          pendingValue !== undefined
                        ) {
                          handleSingleCellChange(
                            item.id,
                            w.minggu_ke,
                            pendingValue
                          );
                        }

                        setInputMap(prev=>{

                        const copy={
                          ...prev
                        };

                        delete copy[
                          inputKey
                        ];

                        return copy;

                        });

                    }}

                    className={`
                        w-full
                        h-[34px]
                        text-center
                        rounded-md
                        outline-none
                        font-mono
                        text-[11px]
                        relative
                        bg-transparent

                        ${
                        isLocked
                        ? "bg-gray-100 text-gray-400"
                        : isActive
                        ? "font-bold text-blue-900"
                        : "text-gray-500"
                        }
                    `}
                    />

                  </td>

              )

            })}

          </tr>
          );
        });
  };
          
    return (
      <>
        <div className="p-6 max-w-[100vw] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
          {error && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <span className="flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </span>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                Tutup
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-secondary hover:border-secondary transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleGenerateWeeks}
                disabled={loadingGenerate}
                className={`${loadingGenerate ? "bg-gray-200 text-gray-500" : "bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                  } flex items-center gap-2 px-5 py-2.5 rounded font-semibold transition-all active:scale-95 cursor-pointer text-sm`}
              >
                <Zap size={18} /> {loadingGenerate ? "Memproses..." : "Generate Kolom Minggu"}
              </button>

              <button
                onClick={handleSaveSchedule}
                className="flex items-center gap-2 bg-success hover:bg-transparent border-2 border-transparent hover:border-success hover:text-success active:scale-95 text-white px-5 py-2.5 rounded font-semibold transition-all active:scale-95 cursor-pointer text-sm"
              >
                <Save size={18} /> Simpan Jadwal Permanen
              </button>
            </div>
          </div>

          {/* HEADER & ACTION BUTTONS */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4">

              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                  Schedule Proyek (Time Schedule)
                  {selectedVersion && (
                    <span
                      className={`
                        px-3 py-1 rounded-full text-sm font-bold
                        ${
                          selectedVersion.revision > 0
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      `}
                    >
                      {selectedVersionLabel}
                    </span>
                  )}
                </h1>
                <p className="text-gray-500">Buat Kurva S Rencana dan jadwalkan bobot bobot pekerjaan</p>
              </div>
            </div>



              <select
                value={selectedVersion?.id || ""}
                className="
                  px-4 py-2
                  border rounded-xl
                  bg-white
                "
                onChange={(e) => {

                  const version =
                    versions.find(
                      v =>
                        v.id === Number(e.target.value)
                    );

                  setSelectedVersion(version);

                }}
              >


              {versions?.map((v) => (

                <option
                  key={v.id}
                  value={v.id}
                >
                  {v.revision > 0
                    ? `${v.code} - Addendum minggu ${v.effective_week}`
                    : `${v.code} - Baseline`}
                </option>

              ))}

            </select>

          </div>

          {selectedVersion && (
            <div
              className={`
                mb-6 rounded-2xl border p-4 flex flex-col md:flex-row
                md:items-center md:justify-between gap-2
                ${
                  selectedVersion.revision > 0
                    ? "bg-orange-50 border-orange-200"
                    : "bg-blue-50 border-blue-200"
                }
              `}
            >
              <div>
                <p
                  className={`
                    text-xs font-black uppercase tracking-widest
                    ${
                      selectedVersion.revision > 0
                        ? "text-orange-600"
                        : "text-blue-600"
                    }
                  `}
                >
                  Version Schedule Aktif
                </p>
                <h2 className="text-xl font-black text-gray-800">
                  {selectedVersionLabel}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedVersionDescription}
                </p>
              </div>
              {selectedVersion.description && (
                <div className="text-sm font-semibold text-gray-600">
                  {selectedVersion.description}
                </div>
              )}
            </div>
          )}

          {selectedVersion?.revision > 0 && (
            <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
              Progress berubah karena ada addendum. Bobot dan volume kontrak dihitung ulang berdasarkan kontrak terbaru, sehingga persentase progress dapat turun walaupun volume realisasi tidak berkurang.
            </div>
          )}

          {/* OVERVIEW CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Kurva S Rencana Kumulatif (%)</h3>
                  <p className="text-sm text-gray-500">Visualisasi bobot pekerjaan yang harus diselesaikan tiap minggu</p>
                </div>
                {!isComplete && scheduleTotal.gt(0) && (
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={14} /> Total Belum 100% ({scheduleTotal.toFixed(2)}%)
                  </span>
                )}
                {isComplete && (
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    Kurva S Lengkap (100%)
                  </span>
                )}
              </div>

              {selectedVersion?.revision > 0 && (
                <div className="
                  mb-4
                  bg-red-50
                  border
                  border-red-200
                  rounded-2xl
                  p-4
                ">

                  <div className="
                    text-red-700
                    font-bold
                    text-sm
                  ">
                    ADDENDUM ACTIVE - {selectedVersionLabel}
                  </div>

                  <div className="
                    text-xs
                    text-red-600
                    mt-1
                  ">

                    {selectedVersion.code}

                    dimulai pada
                    minggu ke

                    {
                      selectedVersion
                        .effective_week
                    }

                  </div>

                </div>
              )}

              <div className="w-full min-w-0 h-[250px] min-h-[250px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: '#64748b'
                        }}

                        tickFormatter={(value) =>
                          Number(value).toFixed(3)
                        }
                      />

                      <RechartsTooltip

                        cursor={{
                          stroke: '#94A3B8',
                          strokeWidth: 1,
                          strokeDasharray: '4 4'
                        }}

                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          boxShadow:
                            '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}

                        formatter={(value) => [

                          Number(value).toFixed(3),

                          ""

                        ]}
                      />
    
                      <Area
                        type="monotone"
                        dataKey="target"
                        name="Komulatif Target (%)"
                        stroke="#4F46E5"
                        strokeWidth={3}
                        fill="url(#colorTarget)"
                      />

                      <Area
                        type="monotone"
                        dataKey="real"
                        name="Komulatif Real (%)"
                        stroke="#10B981"
                        strokeWidth={3}
                        fill="url(#colorReal)"
                      />

                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium bg-gray-50">
                    Klik 'Generate Kolom Minggu' lalu isi bobot di tabel
                  </div>
                )}
              </div>
            </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Review Kinerja Bobot</h3>
                <p className="text-sm text-gray-500 mb-6">Ringkasan hasil plot rancangan kurva.</p>

                <div className="flex-1 flex flex-col justify-center space-y-6">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-600">Total Durasi</span>
                    <span className="text-2xl font-black text-blue-600">{weeks.length} <span className="text-sm font-bold opacity-70">Minggu</span></span>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${isComplete ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <span className="text-sm font-bold text-gray-600">Total Komulatif</span>
                    <span className={`text-2xl font-black ${isComplete ? 'text-emerald-600' : 'text-red-500'}`}>{scheduleTotal.toFixed(3)} <span className="text-sm font-bold opacity-70">%</span></span>
                  </div>
                </div>
              </div>

          </div>

          <button
            onClick={handleExportTimeSchedule}
            className="flex items-center gap-2 bg-secondary hover:bg-transparent border-2 border-secondary/50 hover:border-secondary hover:text-secondary text-white px-5 py-2.5 rounded font-bold transition-all active:scale-95 whitespace-nowrap mb-4 ml-auto cursor-pointer active:scale-95"
          >
            <FileText size={18} /> Export Time Schedule
          </button>

          {/* TABLE SECTION / GANTT CHART ALIAS */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Tabel Rancangan Barchart (Interactive)</h3>
              <span className="text-xs text-gray-500 font-medium">Auto-save tidak diaktifkan, pastikan klik Simpan.</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <div className="flex flex-col mt-3 px-5 md:flex-row md:items-center justify-between gap-3 mb-4">

                {/* 🔥 MODE SWITCH (SEGMENT STYLE) */}
                <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner w-fit">

                  <button
                    onClick={() => setMode("manual")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200
                      ${mode === "manual"
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-500 hover:text-blue-600"}
                    `}
                  >
                    Manual
                  </button>

                  <button
                    onClick={() => setMode("auto")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200
                      ${mode === "auto"
                        ? "bg-green-600 text-white shadow"
                        : "text-gray-500 hover:text-green-600"}
                    `}
                  >
                    Auto
                  </button>
                </div>

                {/* 🔥 INFO MODE (BADGE STYLE) */}
                <div className="flex items-center gap-2 text-xs">

                  <span className="text-gray-400 font-medium">Mode:</span>

                  <span
                    className={`px-3 py-1 rounded-full font-bold tracking-wide
                      ${mode === "manual"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"}
                    `}
                  >
                    {mode === "manual" ? "Manual Mode" : "Auto Balance"}
                  </span>

                </div>

                {selectedVersion?.revision > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetAddendumSchedule}
                      className="px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all"
                    >
                      Kosongkan Jadwal {selectedVersionLabel}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAddendumDetail(prev => !prev)
                      }
                      className={`
                        px-3 py-1 rounded-full text-xs font-bold border transition-all
                        ${
                          showAddendumDetail
                            ? "bg-orange-600 text-white border-orange-600"
                            : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                        }
                      `}
                    >
                      {showAddendumDetail
                        ? "Sembunyikan Detail Addendum"
                        : "Lihat Detail Addendum"}
                    </button>
                  </div>
                )}

              </div>

              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead className="bg-white text-gray-600 shadow-sm relative z-10">
                  <tr>
                    <th className="p-4 border-b border-r border-gray-200 sticky left-0 bg-white z-20 w-[300px]">
                      <div className="text-left uppercase font-black text-xs tracking-wider">Uraian Pekerjaan</div>
                    </th>
                    {selectedVersion?.revision > 0 && showAddendumDetail && (
                      <>
                        <th className="p-3 border-b border-r border-gray-200 text-center uppercase font-black text-[10px] tracking-wider bg-slate-50 min-w-[80px]">Vol MC0</th>
                        <th className="p-3 border-b border-r border-gray-200 text-center uppercase font-black text-[10px] tracking-wider bg-slate-50 min-w-[80px]">Bobot MC0</th>
                        <th className="p-3 border-b border-r border-gray-200 text-center uppercase font-black text-[10px] tracking-wider bg-orange-50 min-w-[80px]">Vol {selectedVersionLabel}</th>
                        <th className="p-3 border-b border-r border-gray-200 text-center uppercase font-black text-[10px] tracking-wider bg-orange-50 min-w-[80px]">Bobot {selectedVersionLabel}</th>
                        <th className="p-3 border-b border-r border-gray-200 text-center uppercase font-black text-[10px] tracking-wider bg-emerald-50 min-w-[95px]">Progres s/d W{Number(selectedVersion.effective_week || 1) - 1}</th>
                      </>
                    )}
                    <th className="p-4 border-b border-r border-gray-200 text-center uppercase font-black text-xs tracking-wider w-[80px]">Bobot</th>

                    {displayWeeks.length > 0 ? (
                      displayWeeks.map((w) => {
                        // 🔥 KOLOM MC1 ADDENDUM
                      if (w.isMC) {
                        return (
                          <th
                            key={w.id}
                            className="min-w-[85px] p-3 border-b border-r-2 border-red-500 bg-red-50 text-center"
                          >
                            <div className="font-bold text-red-600">
                              Sisa
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">
                              {w.code || selectedVersionLabel} W{w.effectiveWeek || selectedVersion?.effective_week}
                            </div>
                          </th>
                        );
                      }

                        // 🔥 WEEK NORMAL
                        return (
                          <th key={w.id} className="p-3 border-b border-r border-gray-100 text-center min-w-[70px] font-medium text-xs bg-gray-50/50">
                            <div className="font-bold text-blue-600">W{w.minggu_ke}</div>
                            <div className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">
                              {new Date(w.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                            </div>
                          </th>
                        );
                      })
                    ) : (
                      <th className="p-4 border-b border-gray-200 text-center italic text-gray-400 font-normal">
                        Buat kolom minggu terlebih dahulu.
                      </th>
                    )}

                  </tr>
                </thead>

                <tbody>
                  {renderRows(tree)}
                </tbody>

                <tfoot className="sticky bottom-0 bg-white z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
                  {footerPlanRows.map(row =>
                    renderFooterRow(row)
                  )}

                  {renderFooterRow({
                    key: "real-weekly",
                    label: "Realisasi Fisik Pekerjaan",
                    subLabel: "Jumlah Per-Minggu",
                    getValue: week =>
                      week.isMC
                        ? null
                        : realPerMinggu[
                            getWeekIndex(
                              week.minggu_ke
                            )
                          ] || 0,
                    rowClassName:
                      "border-t-2 border-green-300 bg-green-50/40",
                    labelClassName:
                      "bg-green-50 text-green-800",
                    subLabelClassName:
                      "bg-green-50 text-green-800"
                  })}

                  {renderFooterRow({
                    key: "real-cumulative",
                    label: "",
                    subLabel:
                      "Jumlah Komulatif Per-Minggu",
                    getValue: week =>
                      week.isMC
                        ? null
                        : realKomulatif[
                            getWeekIndex(
                              week.minggu_ke
                            )
                          ] || 0,
                    rowClassName:
                      "border-b-2 border-green-300 bg-green-50/40",
                    labelClassName:
                      "bg-green-50 text-green-800",
                    subLabelClassName:
                      "bg-green-50 text-green-800"
                  })}

                  {renderFooterRow({
                    key: "deviation-cumulative",
                    label: "Deviasi",
                    subLabel:
                      "Jumlah Komulatif Per-Minggu",
                    getValue: week => {
                      if (week.isMC) {
                        return null;
                      }

                      const real =
                        new Decimal(
                          realKomulatif[
                            getWeekIndex(
                              week.minggu_ke
                            )
                          ] || 0
                        );
                      const plan =
                        getActivePlanCumulative(
                          week.minggu_ke
                        );

                      return plan === null
                        ? null
                        : real.minus(plan);
                    },
                    rowClassName:
                      "border-t-2 border-gray-400 bg-gray-100",
                    labelClassName:
                      "bg-gray-100 text-gray-900",
                    subLabelClassName:
                      "bg-gray-100 text-gray-900"
                  })}
                </tfoot>
              </table>
            </div>
          </div>

        </div>


        <AnimatePresence>
    {showBagiRataModal && (
        <>
          <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBagiRataModal(false)}
              className="fixed inset-0 bg-black/50 z-40"
          />

          <MotionDiv
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-xl z-50 w-full max-w-md"
          >

              <h2 className="text-2xl font-bold mb-6 text-primary">
                Bagi Rata Bobot
              </h2>

              <div className="space-y-4">
                {selectedItem && selectedVersion?.revision > 0 && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm">
                    <div className="font-black text-orange-700 mb-2">
                      Dasar Pembagian {selectedVersionLabel}
                    </div>
                    {(() => {
                      const info = getAddendumInfo(selectedItem);

                      return (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-gray-500 font-bold uppercase">Bobot {selectedVersionLabel}</p>
                            <p className="font-mono font-black text-gray-800">{info.mcBobot.toDecimalPlaces(3).toFixed(3)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-bold uppercase">Progres s/d W{Number(selectedVersion.effective_week || 1) - 1}</p>
                            <p className="font-mono font-black text-emerald-700">{info.beforeProgress.toDecimalPlaces(3).toFixed(3)}%</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500 font-bold uppercase">Sisa yang dibagi</p>
                            <p className="font-mono font-black text-red-700">{info.remaining.toDecimalPlaces(3).toFixed(3)}%</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div>
                    <label className="block mb-2 text-sm font-semibold">
                      Minggu Mulai
                    </label>

                  <input
                      type="number"
                      min={
                        selectedVersion?.revision > 0
                        ? selectedVersion?.effective_week
                        : 1
                      }
                      max={weeks.length}
                      value={bagiRataForm.start}
                      onChange={(e) =>
                          setBagiRataForm({
                            ...bagiRataForm,
                            start: e.target.value
                          })
                      }
                      className="w-full border rounded-lg px-4 py-3"
                    />
                </div>

                <div>
                    <label className="block mb-2 text-sm font-semibold">
                      Minggu Selesai
                    </label>

                    <input
                       type="number"
                        min={
                          selectedVersion?.revision > 0
                          ? selectedVersion?.effective_week
                          : 1
                        }
                        max={weeks.length}
                        value={bagiRataForm.end}
                      onChange={(e) =>
                          setBagiRataForm({
                            ...bagiRataForm,
                            end: e.target.value
                          })
                      }
                      className="w-full border rounded-lg px-4 py-3"
                    />
                </div>

                <div className="flex gap-3 pt-4">

                    <button
                      onClick={() => setShowBagiRataModal(false)}
                      className="flex-1 py-3 border rounded-lg"
                    >
                      Batal
                    </button>

                    <button
                      onClick={submitBagiRata}
                      className="flex-1 py-3 bg-secondary text-white rounded-lg"
                    >
                      Simpan
                    </button>

                </div>

              </div>
          </MotionDiv>
        </>
    )}
  </AnimatePresence>

        <style dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar {
            height: 8px;
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9; 
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1; 
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8; 
          }
        `}} />
      </>
    );
}
