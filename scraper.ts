// -*- lsp-disabled-clients: (ts-ls); -*-
import { DOMParser } from "jsr:@b-fuze/deno-dom";
import { cached } from "npm:@kisaragi-hiu/cached-fetch";

import { writeFileSync } from "node:fs";

interface Tag {
  id: number;
  title: string;
}

interface Word {
  id: number;
  title: string;
  pn: string[];
  zh: string;
  tags: Tag[];
}

function notnull<T>(value: T): NonNullable<T> {
  if (!value) throw new Error("not null");
  return value;
}

function urlToWordId(url: string) {
  return parseInt(url.trim().slice(39));
}

function urlToTagId(url: string) {
  return parseInt(url.trim().slice(43));
}

const words: Word[] = [];

async function fetchPage(page: number) {
  return await cached(`taigi-words-${page}`, () =>
    fetch(`https://www.taigitv.org.tw/taigi-words?page=${page}`, {
      headers: {
        "User-Agent": "Kisaragi Hiu, Kemdict",
      },
    }),
  );
}

async function getPageCount() {
  // get the page count from the pagination widget from the first page
  const text = await fetchPage(1);
  const doc = new DOMParser().parseFromString(text, "text/html");
  const pages = notnull(doc.querySelectorAll(".pagination a.page-link"));
  let page = 1;
  for (const pageElem of pages) {
    const href = pageElem.attributes.getNamedItem("href");
    if (!href) continue;
    const url = href.value;
    const newpage = parseInt(
      notnull(new URLSearchParams(new URL(url).search).get("page")),
    );
    if (newpage > page) page = newpage;
  }
  return page;
}

async function scrapePage(page: number) {
  const text = await fetchPage(page);
  const doc = new DOMParser().parseFromString(text, "text/html");
  const wordsContainer = notnull(doc.querySelector(".doc-con .s4-btng"));
  for (const word of wordsContainer.children) {
    const inner = notnull(word.querySelector(".btngaa"));
    const titleElem = notnull(inner.querySelector("div.h3 a"));
    const id = urlToWordId(
      notnull(titleElem.attributes.getNamedItem("href")).value,
    );
    const title = titleElem.textContent;

    const pns: string[] = [];
    const pnElems = notnull(inner.querySelectorAll("div p.eng span"));
    // We're giving up the audio here
    for (const pnElem of pnElems) {
      pns.push(pnElem.textContent.trim());
    }

    const zh = notnull(
      inner.querySelector("div.row > div > span"),
    ).textContent.trim();

    const tags: Tag[] = [];
    const tagElems = notnull(inner.querySelectorAll("div.pop-tag a"));
    for (const tagElem of tagElems) {
      tags.push({
        id: urlToTagId(notnull(tagElem.attributes.getNamedItem("href")).value),
        title: tagElem.textContent.replace("#", ""),
      });
    }

    words.push({
      id: id,
      title: title,
      pn: pns,
      zh: zh,
      tags: tags,
    });
  }
}

// const total = await getPageCount();
await scrapePage(1);
// for (let page = 1; page <= total; page++) {
//   await scrapePage(page);
// }

// Date in the form of 20201201T235959Z.
const now = new Date().toISOString().replace(/:|-|\.[0-9]*/g, "");
writeFileSync(`scrape-${now}.json`, JSON.stringify(words, null, 1));
