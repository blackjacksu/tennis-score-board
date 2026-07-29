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
    mainDoor: "大門",
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
    needCompletedSet: "需先打完一盤（6-0…6-4、7-5 或 7-6）才能結束",
    notStarted: "未開始",
    plannedCourt: "預定 {n} 號",
    resetScores: "重置所有比分",
    resetPrompt: "請再次輸入管理 PIN 碼以重置所有比分",
    resetConfirm: "確認重置",
    resetWarning: "所有比分將歸零、狀態回到未開始、清除場地。此動作無法復原。",
    cancel: "取消",
    resetDone: "已重置所有比分",
    tiesWon: "團體勝",
    tieRecord: "勝-負-和",
    timetable: "賽程時間表",
    eventDay: "週六",
    allCourts: "全部 {n} 場地",
    findGame: "找球友",
    postRequest: "發布找球需求",
    postRequestHint: "用自己的話寫就好，系統會自動判讀時間、地點與程度。",
    yourName: "你的名字",
    gamePlaceholder: "例如：週四晚上 6-8 點想在 Boston 打雙打，我 3.5",
    contactHandlePlaceholder: "帳號或電話號碼",
    handleIsPublic: "聯絡方式會公開顯示在看板上。",
    post: "發布",
    readingRequest: "解析中…",
    nameRequired: "請填寫名字",
    textRequired: "請描述你想找的球局",
    tooFast: "發布太頻繁，請稍候再試",
    postFailed: "發布失敗，請再試一次",
    yourMatches: "為你找到 {n} 位球友",
    matchStrength: "契合",
    openRequests: "所有找球需求",
    noRequests: "目前還沒有人發布",
    you: "你",
    closePost: "關閉這則需求",
    anyDay: "任何日期",
    anyTime: "任何時間",
    anywhere: "地點不限",
    fmtSingles: "單打",
    fmtDoubles: "雙打",
    fmtEither: "都可以",
    needsPlayers: "還缺 {n} 人",
    reasonSameDay: "同一天",
    reasonFlexibleDay: "日期有彈性",
    reasonTimeOverlap: "時間重疊",
    reasonSameCity: "同一城市",
    reasonSameVenue: "同一球場",
    reasonSameFormat: "打法相同",
    reasonCloseLevel: "程度相近",
    channelNone: "不提供聯絡方式",
    channelMessenger: "Messenger",
    channelInstagram: "Instagram",
    channelWhatsapp: "WhatsApp",
    channelSms: "簡訊",
    openIn: "用 {app} 聯絡",
    shareIntro: "分享",
    copyIntro: "複製訊息",
    copied: "已複製",
    pasteHint: "這個 App 無法預先帶入文字，請先複製訊息再貼上。",
    noContactShared: "對方沒有留聯絡方式 — 可以複製訊息後自行轉發。",
    gallery: "活動花絮",
    managePhotos: "照片管理",
    uploadPhotos: "上傳照片",
    uploadHint:
      "只有工作人員可以上傳，上傳後立即公開顯示。上傳前會在手機端縮圖，同時移除定位等資訊。",
    photoCredit: "拍攝者名字",
    tapToRemove: "點選照片可放大，並可從放大檢視中刪除。",
    errUnauthorized: "需要工作人員權限，請重新登入",
    choosePhotos: "選擇照片",
    photosSelected: "已選 {n} 張",
    maxBatch: "一次最多 {n} 張",
    captionOptional: "說明文字（可不填）",
    upload: "上傳",
    uploading: "上傳中 {done}/{total}…",
    uploadedCount: "已新增 {n} 張照片",
    someFailed: "有 {n} 張沒有成功",
    noPhotos: "還沒有照片 — 上傳第一張吧",
    photoBy: "拍攝者",
    deletePhoto: "刪除這張照片",
    close: "關閉",
    errType: "這個檔案不是圖片",
    errSize: "這張照片太大了",
    errEmpty: "這個檔案是空的",
    errTooFast: "一次上傳太多了，請稍候再試",
    errUploadFailed: "上傳失敗，請再試一次",
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
    mainDoor: "Main Door",
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
    needCompletedSet: "Final needs a completed set — 6-0…6-4, 7-5 or 7-6",
    notStarted: "Not started",
    plannedCourt: "Planned: {n}",
    resetScores: "Reset all scores",
    resetPrompt: "Re-enter the admin PIN to reset all scores",
    resetConfirm: "Reset everything",
    resetWarning: "Every score goes back to 0-0, not started, and off court. This can't be undone.",
    cancel: "Cancel",
    resetDone: "All scores reset",
    tiesWon: "Ties",
    tieRecord: "W-L-T",
    timetable: "Timetable",
    eventDay: "Sat",
    allCourts: "All {n} courts",
    findGame: "Find a Game",
    postRequest: "Post what you're looking for",
    postRequestHint:
      "Write it however you'd say it — the day, time, place, and level get read out automatically.",
    yourName: "Your name",
    gamePlaceholder:
      "e.g. Anyone want to play doubles Thursday 6-8pm in Boston? I'm 3.5",
    contactHandlePlaceholder: "Handle or phone number",
    handleIsPublic: "Your contact shows publicly on this board.",
    post: "Post",
    readingRequest: "Reading your request…",
    nameRequired: "Add your name first",
    textRequired: "Describe the game you're after",
    tooFast: "Slow down a moment, then try again",
    postFailed: "Couldn't post that — try again",
    yourMatches: "{n} players match your post",
    matchStrength: "match",
    openRequests: "Open requests",
    noRequests: "Nobody has posted yet — be first",
    you: "you",
    closePost: "Close this post",
    anyDay: "Any day",
    anyTime: "Any time",
    anywhere: "Anywhere",
    fmtSingles: "Singles",
    fmtDoubles: "Doubles",
    fmtEither: "Singles or doubles",
    needsPlayers: "needs {n}",
    reasonSameDay: "same day",
    reasonFlexibleDay: "flexible day",
    reasonTimeOverlap: "overlapping hours",
    reasonSameCity: "same town",
    reasonSameVenue: "same courts",
    reasonSameFormat: "same format",
    reasonCloseLevel: "similar level",
    channelNone: "No contact",
    channelMessenger: "Messenger",
    channelInstagram: "Instagram",
    channelWhatsapp: "WhatsApp",
    channelSms: "SMS",
    openIn: "Message on {app}",
    shareIntro: "Share",
    copyIntro: "Copy message",
    copied: "Copied",
    pasteHint:
      "This app can't prefill text — copy the message first, then paste it in.",
    noContactShared:
      "They didn't share a contact — copy the message and pass it on yourself.",
    gallery: "Gallery",
    managePhotos: "Photos",
    uploadPhotos: "Add photos",
    uploadHint:
      "Staff only. Photos go live in the viewer gallery straight away, and are public to anyone with the link. They're resized on your phone before upload, which also strips location data.",
    photoCredit: "Photo credit — who took it",
    tapToRemove: "Tap a photo to enlarge it; delete from there.",
    errUnauthorized: "Staff session expired — log in again",
    choosePhotos: "Choose photos",
    photosSelected: "{n} selected",
    maxBatch: "Up to {n} at a time",
    captionOptional: "Caption (optional)",
    upload: "Upload",
    uploading: "Uploading {done}/{total}…",
    uploadedCount: "{n} added to the gallery",
    someFailed: "{n} couldn't be added",
    noPhotos: "No photos yet — add the first one",
    photoBy: "by",
    deletePhoto: "Delete this photo",
    close: "Close",
    errType: "That file isn't an image",
    errSize: "That photo is too large",
    errEmpty: "That file is empty",
    errTooFast: "Too many uploads at once — wait a moment",
    errUploadFailed: "Upload failed — try again",
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
