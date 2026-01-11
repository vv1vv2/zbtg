import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const exportWordsIntoSpecificFormat = async (format: "json" | "csv") => {
  const retrieveWordsListInfo = async (limit: number) => {
    const response = await fetch(
      `https://dict.youdao.com/wordbook/webapi/words?limit=${limit}&offset=0`,
      { credentials: "include" }
    );
    return response.json();
  };

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const detectIfHasLoggedIn = () => {
    const userInfo = document.querySelector(".user-info");
    if (!userInfo) {
      alert("please login your account first before exporting your word book");
      throw new Error("no account is detected");
    }
  };

  const jsonToCsv = (jsonArray: Array<Record<string, unknown>>) => {
    if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
      throw new Error("jsonToCsv: input must be a non-empty array");
    }

    const headers = Object.keys(jsonArray[0]);
    const escapeCsvValue = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = headers.map(escapeCsvValue).join(",");
    const rows = jsonArray.map((obj) =>
      headers.map((key) => escapeCsvValue(obj[key])).join(",")
    );

    return [headerRow, ...rows].join("\r\n");
  };

  detectIfHasLoggedIn();

  const totalWordsCount = (await retrieveWordsListInfo(15)).data.total as number;
  const wordsList = (await retrieveWordsListInfo(totalWordsCount)).data.itemList.map(
    ({ word, trans: meaning }: { word: string; trans: string }) => ({ word, meaning })
  );

  const jsonData = JSON.stringify(wordsList, null, 2);
  if (format === "json") {
    downloadFile(jsonData, "words.json", "application/json");
    return;
  }

  const csvData = jsonToCsv(wordsList);
  downloadFile(csvData, "words.csv", "text/csv");
};

const App = () => {
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setIsWorking(true);
    setStatus(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id || !tab.url?.includes("youdao.com")) {
        setStatus("请先打开 https://dict.youdao.com 的单词本页面。");
        setIsWorking(false);
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: exportWordsIntoSpecificFormat,
        args: ["json"]
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: exportWordsIntoSpecificFormat,
        args: ["csv"]
      });

      setStatus("已开始导出，若浏览器拦截下载请允许此页面。");
    } catch (error) {
      console.error(error);
      setStatus("导出失败，请刷新有道页面后重试。");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <main className="relative w-[320px] animate-float-in overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="pointer-events-none absolute -top-24 right-[-60px] h-40 w-40 rounded-full bg-amber-200/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-[-40px] h-40 w-40 rounded-full bg-rose-200/60 blur-3xl" />

      <div className="relative space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            Youdao Wordbook
          </p>
          <h1 className="text-xl font-semibold text-slate-900">一键导出你的生词本</h1>
          <p className="text-sm text-slate-600">
            支持同时生成 JSON 与 CSV，适合导入 Anki、扇贝或欧路。
          </p>
        </div>

        <button
          className="w-full rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleExport}
          disabled={isWorking}
        >
          {isWorking ? "正在准备导出..." : "导出 JSON + CSV"}
        </button>

        <div className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 text-xs text-slate-600">
          <p>请先打开「我的单词本」页面：</p>
          <a
            className="mt-2 inline-flex items-center gap-2 font-semibold text-slate-900 hover:text-slate-700"
            href="https://dict.youdao.com/wordbook/wordlist"
            target="_blank"
            rel="noreferrer"
          >
            https://dict.youdao.com/wordbook/wordlist
          </a>
        </div>

        {status ? (
          <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-xs text-slate-700">
            {status}
          </p>
        ) : null}
      </div>
    </main>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
