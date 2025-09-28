// -*- lsp-disabled-clients: (ts-ls); -*-
import { DOMParser, Element } from "jsr:@b-fuze/deno-dom";
import { cached } from "npm:@kisaragi-hiu/cached-fetch";

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

async function parsePage(page: number) {
  const text = await cached(`taigi-words-${page}`, () =>
    fetch(`https://www.taigitv.org.tw/taigi-words?page=${page}`, {
      headers: {
        "User-Agent": "Kisaragi Hiu, Kemdict",
      },
    }),
  );
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
      zh: "todo",
      tags: tags,
    });
  }
}

await parsePage(3);
console.log(words);
