import { useMemo, useState } from "react";
import "./styles.css";

/* ---------- 数据模型 ---------- */

type HoofKey = "leftFront" | "rightFront" | "leftHind" | "rightHind";
type HoofStatus = "正常" | "关注" | "异常";

interface HoofAssessment {
  status: HoofStatus;
  note: string;
}

interface ShoeingRecord {
  id: string;
  horseId: string;
  horseType: "运动马" | "休养马";
  date: string; // 修蹄日期
  nextReviewDate: string; // 下次复查日期
  hooves: Record<HoofKey, HoofAssessment>; // 四蹄评估
  gaitIssue: string; // 步态问题
  gaitAbnormal: boolean; // 异常步态标记
  shoeType: string; // 蹄铁类型
  nailPattern: string; // 钉位
  notes: string; // 照片备注
  reviewed: boolean; // 是否已复查
  reviewDate?: string;
  conclusion?: string; // 换蹄结论（复查后才能生成）
}

interface HorseProfile {
  horseId: string;
  records: ShoeingRecord[]; // 新的在前
  latest: ShoeingRecord;
  previous?: ShoeingRecord;
  overdue: boolean;
  overdueDays: number;
}

const HOOF_KEYS: HoofKey[] = ["leftFront", "rightFront", "leftHind", "rightHind"];

const HOOF_LABELS: Record<HoofKey, string> = {
  leftFront: "左前蹄",
  rightFront: "右前蹄",
  leftHind: "左后蹄",
  rightHind: "右后蹄",
};

const HOOF_STATUSES: HoofStatus[] = ["正常", "关注", "异常"];

const SHOE_TYPES = ["钢蹄铁", "铝蹄铁", "加护蹄垫", "平衡蹄铁", "定制蹄铁"];

const FILTERS = ["全部", "异常步态", "复查逾期", "前蹄", "后蹄", "运动马", "休养马"] as const;

const STORAGE_KEY = "farrier-ledger-records-v1";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const dayDiff = (from: string, to: string) =>
  Math.round((new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86400000);

const emptyHooves = (): Record<HoofKey, HoofAssessment> => ({
  leftFront: { status: "正常", note: "" },
  rightFront: { status: "正常", note: "" },
  leftHind: { status: "正常", note: "" },
  rightHind: { status: "正常", note: "" },
});

/* ---------- 初始台账数据 ---------- */

const seedRecords: ShoeingRecord[] = [
  {
    id: "r-h18-1",
    horseId: "HORSE-18",
    horseType: "运动马",
    date: "2026-09-11",
    nextReviewDate: "2026-09-25",
    hooves: {
      leftFront: { status: "正常", note: "" },
      rightFront: { status: "关注", note: "外侧磨耗明显" },
      leftHind: { status: "正常", note: "" },
      rightHind: { status: "正常", note: "" },
    },
    gaitIssue: "右前蹄外侧磨耗，落地略偏",
    gaitAbnormal: false,
    shoeType: "铝蹄铁",
    nailPattern: "6钉位（3-4-5）",
    notes: "右前蹄外侧照片已归档",
    reviewed: false,
  },
  {
    id: "r-h27-1",
    horseId: "HORSE-27",
    horseType: "休养马",
    date: "2026-08-28",
    nextReviewDate: "2026-09-20",
    hooves: {
      leftFront: { status: "正常", note: "" },
      rightFront: { status: "正常", note: "" },
      leftHind: { status: "异常", note: "蹄壁裂纹约2cm" },
      rightHind: { status: "关注", note: "蹄跟偏低" },
    },
    gaitIssue: "后蹄裂纹，慢步有顿挫",
    gaitAbnormal: true,
    shoeType: "加护蹄垫",
    nailPattern: "4钉位（避开裂纹区）",
    notes: "裂纹处拍照归档，需教练复核",
    reviewed: false,
  },
  {
    id: "r-h31-1",
    horseId: "HORSE-31",
    horseType: "运动马",
    date: "2026-09-18",
    nextReviewDate: "2026-10-02",
    hooves: {
      leftFront: { status: "关注", note: "蹄叉轻度萎缩" },
      rightFront: { status: "正常", note: "" },
      leftHind: { status: "正常", note: "" },
      rightHind: { status: "正常", note: "" },
    },
    gaitIssue: "步态轻微不稳，已标记观察",
    gaitAbnormal: true,
    shoeType: "钢蹄铁",
    nailPattern: "6钉位（2-3-4）",
    notes: "需教练复核后决定是否调整",
    reviewed: false,
  },
  {
    id: "r-h42-1",
    horseId: "HORSE-42",
    horseType: "运动马",
    date: "2026-07-30",
    nextReviewDate: "2026-09-10",
    hooves: emptyHooves(),
    gaitIssue: "前蹄磨耗不均",
    gaitAbnormal: false,
    shoeType: "钢蹄铁",
    nailPattern: "6钉位（3-4-5）",
    notes: "",
    reviewed: true,
    reviewDate: "2026-09-10",
    conclusion: "四蹄评估稳定，前蹄磨耗不均建议更换为铝蹄铁减轻负重。",
  },
  {
    id: "r-h42-2",
    horseId: "HORSE-42",
    horseType: "运动马",
    date: "2026-09-10",
    nextReviewDate: "2026-10-22",
    hooves: emptyHooves(),
    gaitIssue: "更换后步态平稳",
    gaitAbnormal: false,
    shoeType: "铝蹄铁",
    nailPattern: "6钉位（3-4-5）",
    notes: "按上次结论更换为铝蹄铁",
    reviewed: false,
  },
];

/* ---------- 台账逻辑 ---------- */

function loadRecords(): ShoeingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ShoeingRecord[];
  } catch {
    /* 忽略损坏的本地数据 */
  }
  return seedRecords;
}

function isOverdue(rec: ShoeingRecord, today: string) {
  return !rec.reviewed && rec.nextReviewDate <= today;
}

function buildProfiles(records: ShoeingRecord[], today: string): HorseProfile[] {
  const byHorse = new Map<string, ShoeingRecord[]>();
  for (const rec of records) {
    const list = byHorse.get(rec.horseId) ?? [];
    list.push(rec);
    byHorse.set(rec.horseId, list);
  }
  const profiles: HorseProfile[] = [];
  for (const [horseId, list] of byHorse) {
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    const latest = list[0];
    profiles.push({
      horseId,
      records: list,
      latest,
      previous: list[1],
      overdue: isOverdue(latest, today),
      overdueDays: isOverdue(latest, today) ? dayDiff(latest.nextReviewDate, today) : 0,
    });
  }
  // 异常步态排在前面，其次逾期，再按复查日期升序
  profiles.sort((a, b) => {
    const ga = Number(b.latest.gaitAbnormal) - Number(a.latest.gaitAbnormal);
    if (ga !== 0) return ga;
    const ov = Number(b.overdue) - Number(a.overdue);
    if (ov !== 0) return ov;
    return a.latest.nextReviewDate < b.latest.nextReviewDate ? -1 : 1;
  });
  return profiles;
}

function buildConclusion(rec: ShoeingRecord, prev?: ShoeingRecord): string {
  const parts: string[] = [];
  const abnormalHooves = HOOF_KEYS.filter((k) => rec.hooves[k].status === "异常").map(
    (k) => HOOF_LABELS[k]
  );
  const watchHooves = HOOF_KEYS.filter((k) => rec.hooves[k].status === "关注").map(
    (k) => HOOF_LABELS[k]
  );
  if (rec.gaitAbnormal) {
    parts.push(
      `步态异常（${rec.gaitIssue || "未详述"}）复查后仍未消除，建议更换蹄铁方案并重新调整钉位`
    );
  } else if (abnormalHooves.length > 0) {
    parts.push(`${abnormalHooves.join("、")}评估异常，建议针对性修形并缩短复查周期`);
  } else if (watchHooves.length > 0) {
    parts.push(`${watchHooves.join("、")}需持续观察，蹄铁方案暂不变更`);
  } else {
    parts.push("四蹄评估稳定，可按当前蹄铁方案续用");
  }
  if (prev && (prev.shoeType !== rec.shoeType || prev.nailPattern !== rec.nailPattern)) {
    parts.push(
      `对比上一副（${prev.shoeType} / ${prev.nailPattern}，${prev.date}装蹄），本次为${rec.shoeType} / ${rec.nailPattern}，下次复查重点对比磨耗差异`
    );
  }
  return parts.join("；") + "。";
}

function toCsv(records: ShoeingRecord[]): string {
  const header = "马匹编号,修蹄日期,左前蹄,右前蹄,左后蹄,右后蹄,步态问题,异常步态,蹄铁类型,钉位,下次复查,已复查,换蹄结论";
  const rows = records.map((r) =>
    [
      r.horseId,
      r.date,
      r.hooves.leftFront.status,
      r.hooves.rightFront.status,
      r.hooves.leftHind.status,
      r.hooves.rightHind.status,
      r.gaitIssue,
      r.gaitAbnormal ? "是" : "否",
      r.shoeType,
      r.nailPattern,
      r.nextReviewDate,
      r.reviewed ? "是" : "否",
      r.conclusion ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return "﻿" + [header, ...rows].join("\n");
}

/* ---------- 表单 ---------- */

interface FormState {
  horseId: string;
  horseType: "运动马" | "休养马";
  date: string;
  nextReviewDate: string;
  hooves: Record<HoofKey, HoofAssessment>;
  gaitIssue: string;
  gaitAbnormal: boolean;
  shoeType: string;
  nailPattern: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  horseId: "",
  horseType: "运动马",
  date: todayStr(),
  nextReviewDate: addDays(todayStr(), 42),
  hooves: emptyHooves(),
  gaitIssue: "",
  gaitAbnormal: false,
  shoeType: SHOE_TYPES[0],
  nailPattern: "",
  notes: "",
});

/* ---------- 组件 ---------- */

function App() {
  const today = todayStr();
  const [records, setRecords] = useState<ShoeingRecord[]>(loadRecords);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");

  const profiles = useMemo(() => buildProfiles(records, today), [records, today]);

  const metrics = useMemo(
    () => [
      { label: "待复查", value: profiles.filter((p) => !p.latest.reviewed).length },
      { label: "异常步态", value: profiles.filter((p) => p.latest.gaitAbnormal).length },
      { label: "更换蹄铁", value: profiles.filter((p) => p.records.length > 1).length },
      { label: "马匹档案", value: profiles.length },
    ],
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    switch (filter) {
      case "异常步态":
        return profiles.filter((p) => p.latest.gaitAbnormal);
      case "复查逾期":
        return profiles.filter((p) => p.overdue);
      case "前蹄":
        return profiles.filter(
          (p) => p.latest.hooves.leftFront.status !== "正常" || p.latest.hooves.rightFront.status !== "正常"
        );
      case "后蹄":
        return profiles.filter(
          (p) => p.latest.hooves.leftHind.status !== "正常" || p.latest.hooves.rightHind.status !== "正常"
        );
      case "运动马":
      case "休养马":
        return profiles.filter((p) => p.latest.horseType === filter);
      default:
        return profiles;
    }
  }, [profiles, filter]);

  // 表单中当前马匹的上一副蹄铁（用于更换时对比）
  const previousShoe = useMemo(() => {
    const profile = profiles.find((p) => p.horseId === form.horseId.trim().toUpperCase());
    return profile?.latest;
  }, [profiles, form.horseId]);

  const persist = (next: ShoeingRecord[]) => {
    setRecords(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const updateHoof = (key: HoofKey, patch: Partial<HoofAssessment>) => {
    setForm((f) => ({ ...f, hooves: { ...f.hooves, [key]: { ...f.hooves[key], ...patch } } }));
  };

  const saveRecord = () => {
    const horseId = form.horseId.trim().toUpperCase();
    if (!horseId) {
      setMessage("请先填写马匹编号");
      return;
    }
    if (!form.date || !form.nextReviewDate) {
      setMessage("请填写修蹄日期和下次复查日期");
      return;
    }
    const record: ShoeingRecord = {
      id: `r-${horseId}-${Date.now()}`,
      horseId,
      horseType: form.horseType,
      date: form.date,
      nextReviewDate: form.nextReviewDate,
      hooves: form.hooves,
      gaitIssue: form.gaitIssue.trim(),
      gaitAbnormal: form.gaitAbnormal,
      shoeType: form.shoeType,
      nailPattern: form.nailPattern.trim(),
      notes: form.notes.trim(),
      reviewed: false,
    };
    persist([...records, record]);
    setForm({ ...emptyForm(), horseId });
    setMessage(
      previousShoe
        ? `${horseId} 已登记换蹄，上一副（${previousShoe.shoeType} / ${previousShoe.nailPattern} / ${previousShoe.date}）已保留在档案中`
        : `${horseId} 已登记并存入马匹档案`
    );
  };

  const markReviewed = (horseId: string) => {
    persist(
      records.map((r) =>
        r.horseId === horseId && !r.reviewed && r.id === profiles.find((p) => p.horseId === horseId)?.latest.id
          ? { ...r, reviewed: true, reviewDate: today }
          : r
      )
    );
    setMessage(`${horseId} 已标记复查，可以生成换蹄结论`);
  };

  const generateConclusion = (horseId: string) => {
    const profile = profiles.find((p) => p.horseId === horseId);
    if (!profile || !profile.latest.reviewed) return; // 未复查不能生成结论
    const conclusion = buildConclusion(profile.latest, profile.previous);
    persist(records.map((r) => (r.id === profile.latest.id ? { ...r, conclusion } : r)));
    setMessage(`${horseId} 换蹄结论已生成`);
  };

  const startReshoe = (profile: HorseProfile) => {
    setForm({
      ...emptyForm(),
      horseId: profile.horseId,
      horseType: profile.latest.horseType,
      shoeType: profile.latest.shoeType,
      nailPattern: profile.latest.nailPattern,
    });
    setMessage(`正在为 ${profile.horseId} 登记新一副蹄铁，上一副信息见下方提示`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(records)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `修蹄台账-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62011 · 蹄铁师工作台 · {today}</p>
        <h1>马术蹄铁修整档案</h1>
        <span>
          登记马匹编号、四蹄评估、步态问题、蹄铁类型和钉位，保存后进入马匹档案。异常步态排在前面，复查到期自动标记逾期，未复查的马匹不能生成换蹄结论；更换蹄铁时保留上一副的类型、钉位和日期，方便下次对比。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>档案筛选</h2>
          <div className="chips">
            {FILTERS.map((item) => (
              <button
                key={item}
                className={filter === item ? "chip-active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="side-note">
            <h3>复查提醒</h3>
            {profiles.filter((p) => p.overdue).length === 0 ? (
              <p>当前没有逾期复查的马匹。</p>
            ) : (
              profiles
                .filter((p) => p.overdue)
                .map((p) => (
                  <p key={p.horseId}>
                    <b>{p.horseId}</b> 复查已逾期 {p.overdueDays} 天（应查 {p.latest.nextReviewDate}）
                  </p>
                ))
            )}
          </div>
        </aside>

        <section className="panel form-panel">
          <div className="heading">
            <div>
              <p>修蹄登记</p>
              <h2>新增修蹄记录</h2>
            </div>
            <button className="primary" onClick={saveRecord}>
              保存记录
            </button>
          </div>

          {message && <p className="form-message">{message}</p>}

          <div className="field-grid">
            <label>
              <span>马匹编号</span>
              <input
                placeholder="如 HORSE-18"
                value={form.horseId}
                onChange={(e) => setForm({ ...form, horseId: e.target.value })}
              />
            </label>
            <label>
              <span>马匹类型</span>
              <select
                value={form.horseType}
                onChange={(e) => setForm({ ...form, horseType: e.target.value as FormState["horseType"] })}
              >
                <option>运动马</option>
                <option>休养马</option>
              </select>
            </label>
            <label>
              <span>修蹄日期</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label>
              <span>下次复查</span>
              <input
                type="date"
                value={form.nextReviewDate}
                onChange={(e) => setForm({ ...form, nextReviewDate: e.target.value })}
              />
            </label>
            <label>
              <span>蹄铁类型</span>
              <select
                value={form.shoeType}
                onChange={(e) => setForm({ ...form, shoeType: e.target.value })}
              >
                {SHOE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              <span>钉位</span>
              <input
                placeholder="如 6钉位（3-4-5）"
                value={form.nailPattern}
                onChange={(e) => setForm({ ...form, nailPattern: e.target.value })}
              />
            </label>
            <label>
              <span>步态问题</span>
              <input
                placeholder="如 右前蹄外侧磨耗"
                value={form.gaitIssue}
                onChange={(e) => setForm({ ...form, gaitIssue: e.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <span>异常步态标记</span>
              <span className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.gaitAbnormal}
                  onChange={(e) => setForm({ ...form, gaitAbnormal: e.target.checked })}
                />
                步态异常，优先处理
              </span>
            </label>
            <label className="full-width">
              <span>照片备注</span>
              <input
                placeholder="照片编号或补充说明"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </div>

          <h3 className="hoof-title">四蹄评估</h3>
          <div className="hoof-grid">
            {HOOF_KEYS.map((key) => (
              <div key={key} className={`hoof-card hoof-${form.hooves[key].status}`}>
                <b>{HOOF_LABELS[key]}</b>
                <select
                  value={form.hooves[key].status}
                  onChange={(e) => updateHoof(key, { status: e.target.value as HoofStatus })}
                >
                  {HOOF_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <input
                  placeholder="评估备注"
                  value={form.hooves[key].note}
                  onChange={(e) => updateHoof(key, { note: e.target.value })}
                />
              </div>
            ))}
          </div>

          {previousShoe && (
            <p className="prev-shoe">
              上一副蹄铁：{previousShoe.shoeType} / {previousShoe.nailPattern || "钉位未录"} /{" "}
              {previousShoe.date} 装蹄 —— 保存后将作为历史对比保留在档案中
            </p>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>马匹档案</p>
            <h2>修蹄台账（{filteredProfiles.length}）</h2>
          </div>
          <button onClick={exportCsv}>导出CSV</button>
        </div>

        <div className="records">
          {filteredProfiles.length === 0 && <p className="empty">该筛选条件下暂无马匹档案。</p>}
          {filteredProfiles.map((p) => {
            const latest = p.latest;
            return (
              <article
                key={p.horseId}
                className={`horse-card${latest.gaitAbnormal ? " is-abnormal" : ""}`}
              >
                <header>
                  <div>
                    <h3>{p.horseId}</h3>
                    <span className="sub">
                      {latest.horseType} · 共 {p.records.length} 次修蹄记录
                    </span>
                  </div>
                  <div className="badges">
                    {latest.gaitAbnormal && <span className="badge danger">异常步态</span>}
                    {p.overdue && <span className="badge warn">复查逾期 {p.overdueDays} 天</span>}
                    {!latest.reviewed && !p.overdue && (
                      <span className="badge info">待复查 {latest.nextReviewDate}</span>
                    )}
                    {latest.reviewed && <span className="badge ok">已复查 {latest.reviewDate}</span>}
                  </div>
                </header>

                <div className="hoof-row">
                  {HOOF_KEYS.map((key) => (
                    <span key={key} className={`hoof-chip hoof-${latest.hooves[key].status}`}>
                      {HOOF_LABELS[key]}：{latest.hooves[key].status}
                      {latest.hooves[key].note ? `（${latest.hooves[key].note}）` : ""}
                    </span>
                  ))}
                </div>

                <p className="gait">
                  步态问题：{latest.gaitIssue || "无"} · 修蹄日期 {latest.date} · 下次复查{" "}
                  {latest.nextReviewDate}
                </p>

                <div className="shoe-compare">
                  <div>
                    <b>当前蹄铁</b>
                    <span>
                      {latest.shoeType} · 钉位 {latest.nailPattern || "未录"} · {latest.date}
                    </span>
                  </div>
                  {p.previous && (
                    <div className="prev">
                      <b>上一副</b>
                      <span>
                        {p.previous.shoeType} · 钉位 {p.previous.nailPattern || "未录"} ·{" "}
                        {p.previous.date}
                      </span>
                    </div>
                  )}
                </div>

                {latest.notes && <p className="notes">备注：{latest.notes}</p>}

                {latest.conclusion ? (
                  <p className="conclusion">换蹄结论：{latest.conclusion}</p>
                ) : (
                  !latest.reviewed && (
                    <p className="conclusion locked">未复查，暂不能生成换蹄结论</p>
                  )
                )}

                <div className="actions">
                  <button onClick={() => markReviewed(p.horseId)} disabled={latest.reviewed}>
                    {latest.reviewed ? "已复查" : "标记已复查"}
                  </button>
                  <button
                    onClick={() => generateConclusion(p.horseId)}
                    disabled={!latest.reviewed || Boolean(latest.conclusion)}
                    title={!latest.reviewed ? "未复查的马不能生成换蹄结论" : ""}
                  >
                    {latest.conclusion ? "结论已生成" : "生成换蹄结论"}
                  </button>
                  <button onClick={() => startReshoe(p)}>更换蹄铁</button>
                </div>

                {p.records.length > 1 && (
                  <details className="history">
                    <summary>蹄铁更换历史（{p.records.length}）</summary>
                    <ul>
                      {p.records.map((r) => (
                        <li key={r.id}>
                          {r.date} · {r.shoeType} · 钉位 {r.nailPattern || "未录"} ·{" "}
                          {r.gaitIssue || "无步态问题"}
                          {r.conclusion ? ` · 结论：${r.conclusion}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
