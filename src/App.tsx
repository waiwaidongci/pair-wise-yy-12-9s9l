import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const project = {
  id: "hxyfront-62011",
  sourceNo: 6,
  port: 62011,
  title: "马术蹄铁修整档案",
  prompt:
    "面向马术俱乐部蹄铁师的修蹄台账：登记马匹编号、四蹄评估、步态问题、蹄铁类型与钉位，保存后进入马匹档案；异常步态排在前面，复查逾期自动标记，未复查的马不能生成换蹄结论，更换蹄铁时保留上一副的类型、钉位和日期。",
};

type HoofKey = "LF" | "RF" | "LH" | "RH";
const HOOF_KEYS: HoofKey[] = ["LF", "RF", "LH", "RH"];
const HOOF_LABELS: Record<HoofKey, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};
const HOOF_CONDITIONS = ["正常", "磨耗", "裂纹", "变形", "外翻", "蹄叉腐烂"];
const SHOE_TYPES = ["普通铁蹄铁", "铝蹄铁", "加护蹄垫", "全包蹄铁", "裸蹄"];
const VISIT_TYPES = ["初诊", "复查", "换蹄"] as const;
const HORSE_STATUS = ["运动马", "休养马"] as const;

type VisitType = (typeof VISIT_TYPES)[number];
type HorseStatus = (typeof HORSE_STATUS)[number];

interface HoofAssessment {
  condition: string;
  note: string;
}

interface ShoeingRecord {
  id: string;
  horseId: string;
  visitType: VisitType;
  date: string;
  nextReviewDate: string;
  gaitIssue: string;
  gaitAbnormal: boolean;
  shoeType: string;
  nailPattern: string;
  hooves: Record<HoofKey, HoofAssessment>;
  note: string;
}

interface ShoeChange {
  date: string;
  fromDate: string;
  fromType: string;
  fromNails: string;
  toType: string;
  toNails: string;
}

interface HorseProfile {
  horseId: string;
  status: HorseStatus;
  records: ShoeingRecord[];
  shoeHistory: ShoeChange[];
  conclusion?: { date: string; text: string };
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

const emptyHooves = (): Record<HoofKey, HoofAssessment> => ({
  LF: { condition: "正常", note: "" },
  RF: { condition: "正常", note: "" },
  LH: { condition: "正常", note: "" },
  RH: { condition: "正常", note: "" },
});

const latestRecord = (p: HorseProfile) => p.records[p.records.length - 1];

const isOverdue = (p: HorseProfile) => {
  const last = latestRecord(p);
  return !!last && last.nextReviewDate < todayStr();
};

const hoof = (condition: string, note = ""): HoofAssessment => ({ condition, note });

const seedProfiles: Record<string, HorseProfile> = {
  "HORSE-18": {
    horseId: "HORSE-18",
    status: "运动马",
    records: [
      {
        id: "seed-18-1",
        horseId: "HORSE-18",
        visitType: "初诊",
        date: "2026-09-08",
        nextReviewDate: "2026-09-22",
        gaitIssue: "右前蹄外侧磨耗，落蹄偏重",
        gaitAbnormal: false,
        shoeType: "铝蹄铁",
        nailPattern: "前蹄6钉 / 后蹄4钉",
        hooves: {
          LF: hoof("正常"),
          RF: hoof("磨耗", "外侧蹄壁磨耗明显"),
          LH: hoof("正常"),
          RH: hoof("正常"),
        },
        note: "已拍照归档",
      },
    ],
    shoeHistory: [],
  },
  "HORSE-27": {
    horseId: "HORSE-27",
    status: "休养马",
    records: [
      {
        id: "seed-27-1",
        horseId: "HORSE-27",
        visitType: "初诊",
        date: "2026-08-20",
        nextReviewDate: "2026-09-03",
        gaitIssue: "后蹄裂纹，慢步跛行",
        gaitAbnormal: true,
        shoeType: "普通铁蹄铁",
        nailPattern: "后蹄4钉",
        hooves: {
          LF: hoof("正常"),
          RF: hoof("正常"),
          LH: hoof("裂纹", "蹄壁纵裂约2cm"),
          RH: hoof("正常"),
        },
        note: "裂纹处拍照",
      },
      {
        id: "seed-27-2",
        horseId: "HORSE-27",
        visitType: "换蹄",
        date: "2026-09-15",
        nextReviewDate: "2026-09-29",
        gaitIssue: "跛行减轻，仍需护蹄垫缓冲",
        gaitAbnormal: true,
        shoeType: "加护蹄垫",
        nailPattern: "后蹄4钉 + 护垫固定",
        hooves: {
          LF: hoof("正常"),
          RF: hoof("正常"),
          LH: hoof("裂纹", "裂纹未扩展"),
          RH: hoof("正常"),
        },
        note: "换蹄后步态视频已存档",
      },
    ],
    shoeHistory: [
      {
        date: "2026-09-15",
        fromDate: "2026-08-20",
        fromType: "普通铁蹄铁",
        fromNails: "后蹄4钉",
        toType: "加护蹄垫",
        toNails: "后蹄4钉 + 护垫固定",
      },
    ],
  },
  "HORSE-31": {
    horseId: "HORSE-31",
    status: "运动马",
    records: [
      {
        id: "seed-31-1",
        horseId: "HORSE-31",
        visitType: "初诊",
        date: "2026-09-06",
        nextReviewDate: "2026-09-20",
        gaitIssue: "步态轻微不稳，需教练复核",
        gaitAbnormal: true,
        shoeType: "普通铁蹄铁",
        nailPattern: "四蹄各6钉",
        hooves: {
          LF: hoof("磨耗", "蹄尖磨耗"),
          RF: hoof("正常"),
          LH: hoof("正常"),
          RH: hoof("变形", "蹄踵偏低"),
        },
        note: "已标记，通知教练",
      },
      {
        id: "seed-31-2",
        horseId: "HORSE-31",
        visitType: "复查",
        date: "2026-09-20",
        nextReviewDate: "2026-10-04",
        gaitIssue: "步态回稳，直线快走正常",
        gaitAbnormal: false,
        shoeType: "普通铁蹄铁",
        nailPattern: "四蹄各6钉",
        hooves: {
          LF: hoof("正常"),
          RF: hoof("正常"),
          LH: hoof("正常"),
          RH: hoof("变形", "蹄踵仍偏低，继续观察"),
        },
        note: "复查完成",
      },
    ],
    shoeHistory: [],
  },
};

const STORAGE_KEY = "farrier-ledger-v1";

const loadProfiles = (): Record<string, HorseProfile> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, HorseProfile>;
  } catch {
    // 数据损坏时回退到示例数据
  }
  return seedProfiles;
};

interface FormState {
  horseId: string;
  status: HorseStatus;
  visitType: VisitType;
  date: string;
  nextReviewDate: string;
  gaitIssue: string;
  gaitAbnormal: boolean;
  shoeType: string;
  nailPattern: string;
  hooves: Record<HoofKey, HoofAssessment>;
  note: string;
}

const emptyForm = (): FormState => ({
  horseId: "",
  status: "运动马",
  visitType: "初诊",
  date: todayStr(),
  nextReviewDate: "",
  gaitIssue: "",
  gaitAbnormal: false,
  shoeType: SHOE_TYPES[0],
  nailPattern: "",
  hooves: emptyHooves(),
  note: "",
});

const FILTERS = ["全部", "前蹄", "后蹄", "运动马", "休养马"] as const;

function App() {
  const [profiles, setProfiles] = useState<Record<string, HorseProfile>>(loadProfiles);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [savedTip, setSavedTip] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const allRecords = useMemo(
    () =>
      Object.values(profiles)
        .flatMap((p) => p.records)
        .sort((a, b) => {
          // 异常步态排在前面，其次按修蹄日期倒序
          if (a.gaitAbnormal !== b.gaitAbnormal) return a.gaitAbnormal ? -1 : 1;
          return b.date.localeCompare(a.date);
        }),
    [profiles]
  );

  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const profile = profiles[r.horseId];
      if (filter === "前蹄")
        return r.hooves.LF.condition !== "正常" || r.hooves.RF.condition !== "正常";
      if (filter === "后蹄")
        return r.hooves.LH.condition !== "正常" || r.hooves.RH.condition !== "正常";
      if (filter === "运动马" || filter === "休养马") return profile?.status === filter;
      return true;
    });
  }, [allRecords, filter, profiles]);

  const metrics = useMemo(() => {
    const horses = Object.values(profiles);
    const today = todayStr();
    const pendingReview = horses.filter((p) => {
      const last = latestRecord(p);
      return last && daysBetween(today, last.nextReviewDate) <= 7;
    }).length;
    const abnormal = horses.filter((p) => latestRecord(p)?.gaitAbnormal).length;
    const shoeChanges = horses.reduce((sum, p) => sum + p.shoeHistory.length, 0);
    return [
      { label: "待复查", value: pendingReview },
      { label: "异常步态", value: abnormal },
      { label: "更换蹄铁", value: shoeChanges },
      { label: "马匹档案", value: horses.length },
    ];
  }, [profiles]);

  const setHoof = (key: HoofKey, patch: Partial<HoofAssessment>) =>
    setForm((f) => ({ ...f, hooves: { ...f.hooves, [key]: { ...f.hooves[key], ...patch } } }));

  const saveRecord = () => {
    if (!form.horseId.trim()) {
      alert("请填写马匹编号");
      return;
    }
    if (!form.date || !form.nextReviewDate) {
      alert("请填写修蹄日期和下次复查日期");
      return;
    }
    const horseId = form.horseId.trim().toUpperCase();
    const record: ShoeingRecord = {
      id: `${horseId}-${Date.now()}`,
      horseId,
      visitType: form.visitType,
      date: form.date,
      nextReviewDate: form.nextReviewDate,
      gaitIssue: form.gaitIssue.trim() || "未记录",
      gaitAbnormal: form.gaitAbnormal,
      shoeType: form.shoeType,
      nailPattern: form.nailPattern.trim() || "未记录",
      hooves: form.hooves,
      note: form.note.trim(),
    };
    setProfiles((prev) => {
      const existing = prev[horseId];
      const profile: HorseProfile =
        existing ?? { horseId, status: form.status, records: [], shoeHistory: [] };
      const last = latestRecord(profile);
      const shoeHistory = [...profile.shoeHistory];
      // 更换蹄铁时保留上一副的类型、钉位和日期，便于下次对比
      if (last && (last.shoeType !== record.shoeType || last.nailPattern !== record.nailPattern)) {
        shoeHistory.push({
          date: record.date,
          fromDate: last.date,
          fromType: last.shoeType,
          fromNails: last.nailPattern,
          toType: record.shoeType,
          toNails: record.nailPattern,
        });
      }
      const records = [...profile.records, record].sort((a, b) => a.date.localeCompare(b.date));
      return {
        ...prev,
        [horseId]: { ...profile, status: form.status, records, shoeHistory },
      };
    });
    setSavedTip(`已保存 ${horseId} 的${form.visitType}记录，并归入马匹档案`);
    setForm((f) => ({ ...emptyForm(), horseId: f.horseId, status: f.status }));
  };

  const generateConclusion = (horseId: string) => {
    const profile = profiles[horseId];
    const last = profile && latestRecord(profile);
    // 未复查的马不能生成换蹄结论
    if (!profile || !last || last.visitType !== "复查") return;
    const problemHooves = HOOF_KEYS.filter((k) => last.hooves[k].condition !== "正常").map(
      (k) => `${HOOF_LABELS[k]}（${last.hooves[k].condition}）`
    );
    const lastChange = profile.shoeHistory[profile.shoeHistory.length - 1];
    const text =
      `${last.date} 复查结论：${last.gaitAbnormal ? "步态仍异常" : "步态恢复正常"}；` +
      (problemHooves.length ? `${problemHooves.join("、")}需继续处理。` : "四蹄评估正常。") +
      (lastChange
        ? `对比上一副蹄铁（${lastChange.fromDate} · ${lastChange.fromType} · ${lastChange.fromNails}），` +
          `现为 ${lastChange.toType}（${lastChange.toNails}）。`
        : `当前蹄铁：${last.shoeType}（${last.nailPattern}）。`) +
      (last.gaitAbnormal
        ? "建议调整蹄铁方案并缩短复查周期。"
        : "建议沿用现有蹄铁方案，按复查日期回访。");
    setProfiles((prev) => ({
      ...prev,
      [horseId]: { ...profile, conclusion: { date: todayStr(), text } },
    }));
  };

  const exportCsv = () => {
    const header = [
      "马匹编号",
      "记录类型",
      "修蹄日期",
      "下次复查",
      "步态问题",
      "异常步态",
      "蹄铁类型",
      "钉位",
      ...HOOF_KEYS.map((k) => HOOF_LABELS[k]),
      "备注",
    ];
    const rows = allRecords.map((r) => [
      r.horseId,
      r.visitType,
      r.date,
      r.nextReviewDate,
      r.gaitIssue,
      r.gaitAbnormal ? "是" : "否",
      r.shoeType,
      r.nailPattern,
      ...HOOF_KEYS.map((k) =>
        r.hooves[k].note ? `${r.hooves[k].condition}(${r.hooves[k].note})` : r.hooves[k].condition
      ),
      r.note,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `修蹄台账-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedProfiles = useMemo(
    () =>
      Object.values(profiles).sort((a, b) => {
        // 档案里同样让异常步态的马排在前面
        const abA = latestRecord(a)?.gaitAbnormal ? 0 : 1;
        const abB = latestRecord(b)?.gaitAbnormal ? 0 : 1;
        if (abA !== abB) return abA - abB;
        return a.horseId.localeCompare(b.horseId);
      }),
    [profiles]
  );

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>台账筛选</h2>
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
          <p className="aside-tip">
            当前显示 {filteredRecords.length} / {allRecords.length} 条修蹄记录，异常步态自动排在前面。
          </p>
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
          {savedTip && <p className="saved-tip">{savedTip}</p>}
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
              <span>马匹状态</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as HorseStatus })}
              >
                {HORSE_STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              <span>记录类型</span>
              <select
                value={form.visitType}
                onChange={(e) => setForm({ ...form, visitType: e.target.value as VisitType })}
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
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
                placeholder="如 前蹄6钉 / 后蹄4钉"
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
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.gaitAbnormal}
              onChange={(e) => setForm({ ...form, gaitAbnormal: e.target.checked })}
            />
            <span>标记为异常步态（保存后排在台账最前）</span>
          </label>

          <div className="hoof-grid">
            <p className="hoof-title">四蹄评估</p>
            {HOOF_KEYS.map((key) => (
              <div className="hoof-row" key={key}>
                <b>{HOOF_LABELS[key]}</b>
                <select
                  value={form.hooves[key].condition}
                  onChange={(e) => setHoof(key, { condition: e.target.value })}
                >
                  {HOOF_CONDITIONS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  placeholder="评估备注（可选）"
                  value={form.hooves[key].note}
                  onChange={(e) => setHoof(key, { note: e.target.value })}
                />
              </div>
            ))}
          </div>

          <label>
            <span>照片备注</span>
            <input
              placeholder="如 裂纹处已拍照归档"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>修蹄台账</p>
            <h2>全部修蹄记录</h2>
          </div>
          <button onClick={exportCsv}>导出CSV</button>
        </div>
        <div className="records">
          {filteredRecords.length === 0 && <p className="empty">当前筛选下暂无记录。</p>}
          {filteredRecords.map((record, index) => {
            const profile = profiles[record.horseId];
            const overdue =
              profile && latestRecord(profile).id === record.id && isOverdue(profile);
            const problemHooves = HOOF_KEYS.filter((k) => record.hooves[k].condition !== "正常");
            return (
              <article key={record.id} className={record.gaitAbnormal ? "record-abnormal" : ""}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div>
                  <h3>
                    {record.horseId}
                    <span className="tag">{record.visitType}</span>
                    {record.gaitAbnormal && <span className="tag tag-danger">异常步态</span>}
                    {overdue && (
                      <span className="tag tag-overdue">
                        复查逾期{daysBetween(record.nextReviewDate, todayStr())}天
                      </span>
                    )}
                  </h3>
                  <p>
                    {record.date} 修蹄 · 下次复查 {record.nextReviewDate} · {record.gaitIssue}
                  </p>
                  <p>
                    {record.shoeType} · 钉位：{record.nailPattern}
                    {problemHooves.length > 0 &&
                      ` · 异常蹄：${problemHooves
                        .map((k) => `${HOOF_LABELS[k]}${record.hooves[k].condition}`)
                        .join("、")}`}
                    {record.note && ` · ${record.note}`}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>马匹档案</p>
            <h2>蹄铁更换历史与换蹄结论</h2>
          </div>
        </div>
        <div className="profiles">
          {sortedProfiles.map((profile) => {
            const last = latestRecord(profile);
            const overdue = isOverdue(profile);
            const canConclude = last?.visitType === "复查";
            return (
              <article key={profile.horseId} className="profile-card">
                <header>
                  <h3>{profile.horseId}</h3>
                  <span className="tag">{profile.status}</span>
                  {last?.gaitAbnormal && <span className="tag tag-danger">异常步态</span>}
                  {overdue ? (
                    <span className="tag tag-overdue">
                      复查逾期{daysBetween(last.nextReviewDate, todayStr())}天
                    </span>
                  ) : (
                    last && <span className="tag tag-ok">下次复查 {last.nextReviewDate}</span>
                  )}
                </header>
                {last && (
                  <p className="profile-line">
                    当前蹄铁：{last.shoeType} · 钉位：{last.nailPattern} · 装蹄日期 {last.date} ·
                    共 {profile.records.length} 条记录
                  </p>
                )}

                <div className="history">
                  <b>蹄铁更换历史</b>
                  {profile.shoeHistory.length === 0 && (
                    <p className="empty">暂无更换记录，仍使用首副蹄铁。</p>
                  )}
                  {profile.shoeHistory.map((change, i) => (
                    <div className="history-item" key={i}>
                      <span className="history-date">{change.date}</span>
                      <div>
                        <p>
                          上一副：{change.fromType} · {change.fromNails}（{change.fromDate} 装蹄）
                        </p>
                        <p>
                          更换为：{change.toType} · {change.toNails}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="conclusion">
                  <b>换蹄结论</b>
                  {profile.conclusion ? (
                    <p>
                      <span className="tag tag-ok">{profile.conclusion.date}</span>{" "}
                      {profile.conclusion.text}
                    </p>
                  ) : (
                    <p className="empty">
                      {canConclude ? "复查已完成，可生成换蹄结论。" : "未复查，不能生成换蹄结论。"}
                    </p>
                  )}
                  <button
                    className="primary"
                    disabled={!canConclude}
                    title={canConclude ? "" : "需先完成一次复查记录"}
                    onClick={() => generateConclusion(profile.horseId)}
                  >
                    生成换蹄结论
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
