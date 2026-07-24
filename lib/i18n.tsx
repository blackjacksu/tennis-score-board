"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Team } from "./types";

const dictionaries = {
  zh: {
    appTitle: "TAA 網球團體賽",
    liveScores: "即時比分",
    standings: "團體戰績",
    wins: "勝場",
    gamesWon: "局數",
    round: "第 {n} 輪",
    vs: "對",
    line: "組別",
    court: "場地",
    scheduled: "未開始",
    inProgress: "進行中",
    completed: "完賽",
    noMatches: "尚無比賽資料",
    loading: "載入中…",
    notConfigured: "尚未連接資料庫 — 請先依照 README 設定 Supabase。",
    adminTitle: "工作人員登入",
    enterPin: "請輸入管理 PIN 碼",
    login: "登入",
    wrongPin: "PIN 碼錯誤，請再試一次",
    scoreReporting: "比分回報",
    startMatch: "開始比賽",
    markFinal: "完賽",
    reopen: "重新開啟",
    saving: "儲存中…",
    viewerBoard: "觀眾看板",
    qrTitle: "掃描 QR Code",
    qrViewer: "觀眾：即時比分",
    qrAdmin: "工作人員：比分回報",
    print: "列印",
    tbd: "待定",
    finalResult: "最終戰績",
    matchesWon: "勝場",
    champion: "冠軍",
    onePointTie: "平手 — 一分決勝",
    onePointNeeded: "需一分決勝：",
    tiebreakRule: "排名依據：勝場 › 局數 › 一分決勝",
    matchesFinal: "{n}/{total} 場完賽",
    live: "進行中",
    courtMap: "場地圖",
    nowPlaying: "現正比賽",
    courtOpen: "空場",
    rating: "分級",
    spectators: "觀眾席",
    courtsInUse: "{n}/6 場地使用中",
    roster: "隊伍名單",
    captain: "隊長",
    teamNtrp: "隊伍總分",
    playerCount: "{n} 位選手",
    courtTbd: "未排場地",
    courtRange: "場地請填 {min}–{max}，留空表示未排",
    courtTaken: "場地 {n} 已有其他進行中的比賽",
    courtNeedsStart: "開始比賽後才會出現在場地圖",
    invalidScore: "請輸入 0–7（7 僅限 7-5 或 7-6）",
    scoreHint: "可直接輸入比分",
    tiesWon: "團體勝",
    timetable: "賽程時間表",
    eventDay: "週六",
    allCourts: "全部 {n} 場地",
  },
  en: {
    appTitle: "TAA Tennis Team Tournament",
    liveScores: "Live Scores",
    standings: "Team Standings",
    wins: "Wins",
    gamesWon: "Games",
    round: "Round {n}",
    vs: "vs",
    line: "Line",
    court: "Court",
    scheduled: "Scheduled",
    inProgress: "Live",
    completed: "Final",
    noMatches: "No matches yet",
    loading: "Loading…",
    notConfigured:
      "Database not connected yet — follow the README to set up Supabase.",
    adminTitle: "Staff Login",
    enterPin: "Enter admin PIN",
    login: "Log in",
    wrongPin: "Wrong PIN, please try again",
    scoreReporting: "Score Reporting",
    startMatch: "Start match",
    markFinal: "Final",
    reopen: "Reopen",
    saving: "Saving…",
    viewerBoard: "Viewer board",
    qrTitle: "Scan the QR Code",
    qrViewer: "Spectators: live scores",
    qrAdmin: "Staff: score reporting",
    print: "Print",
    tbd: "TBD",
    finalResult: "Final Result",
    matchesWon: "Matches",
    champion: "Champion",
    onePointTie: "Tie — one-point match",
    onePointNeeded: "One-point match needed:",
    tiebreakRule: "Ranking: matches › games › one-point match",
    matchesFinal: "{n}/{total} matches final",
    live: "Live",
    courtMap: "Court Map",
    nowPlaying: "Now Playing",
    courtOpen: "Open",
    rating: "NTRP",
    spectators: "Spectators",
    courtsInUse: "{n}/6 courts in use",
    roster: "Teams",
    captain: "Captain",
    teamNtrp: "Team NTRP",
    playerCount: "{n} players",
    courtTbd: "No court",
    courtRange: "Court {min}–{max}, or blank for none",
    courtTaken: "Court {n} already has a live match",
    courtNeedsStart: "Shows on the court map once the match starts",
    invalidScore: "Enter 0–7 (a 7 only as 7-5 or 7-6)",
    scoreHint: "Type a score directly",
    tiesWon: "Ties",
    timetable: "Timetable",
    eventDay: "Sat",
    allCourts: "All {n} courts",
  },
} as const;

export type Lang = keyof typeof dictionaries;
export type DictKey = keyof (typeof dictionaries)["en"];

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  teamName: (team: Team | undefined) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem("taa-lang");
    if (saved === "zh" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("taa-lang", next);
  };

  const t: I18nValue["t"] = (key, vars) => {
    let text: string = dictionaries[lang][key];
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  const teamName = (team: Team | undefined) => {
    if (!team) return "?";
    return lang === "zh" && team.name_zh ? team.name_zh : team.name;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, teamName }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
