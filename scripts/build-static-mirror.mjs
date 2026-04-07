import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import staticMirrorData from "./static-mirror-data.mjs";

const cwd = process.cwd();
const outDir = path.join(cwd, "ZATCA-mirror-js");
const assetsDir = path.join(outDir, "assets");
const remoteDir = path.join(assetsDir, "remote");
const siteOrigin = "https://gstc.gov.sa";

const endpointBase = `${siteOrigin}/_LAYOUTS/15/GSTC.Portal`;

const sharedSurveyUrl = `${endpointBase}/SurveyHandler.ashx?op=getendusersurvey`;
const votingCurrentUrl = `${endpointBase}/VotingHandler.ashx?op=getCurrent&qList=/Admin/Lists/VotingQuestions&aList=/Admin/Lists/VotingAnswers&viewName=Home`;

const langConfig = {
  ar: {
    sourceHtml: path.join(cwd, "index.html"),
    outputHtml: path.join(outDir, "index.html"),
    htmlAssetPrefix: "assets/",
    cssPrefix: "Style%20Library/GSTC/css",
    langAttr: "ar-SA",
    dir: "rtl",
    pageTitle: "الصفحة الرئيسية | الأمانة العامة للجان الزكوية والضريبية والجمركية",
    basePath: "/ar",
  },
  en: {
    sourceHtml: path.join(cwd, "en/Pages/default.aspx.html"),
    outputHtml: path.join(outDir, "en/index.html"),
    htmlAssetPrefix: "../assets/",
    cssPrefix: "../Style%20Library/GSTC/css",
    langAttr: "en-US",
    dir: "ltr",
    pageTitle: "Home | General Secretariat of Zakat, Tax and Customs Committees",
    basePath: "/en",
  },
};

const downloadCache = new Map();

function absoluteUrl(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, siteOrigin).href;
  } catch {
    return value;
  }
}

function decodeEntities(value) {
  return String(value ?? "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .trim();
}

function extractImageSrc(markup) {
  const match = /src="([^"]+)"/i.exec(markup || "");
  return match ? absoluteUrl(match[1]) : "";
}

function sanitizeBasename(url) {
  const pathname = new URL(url).pathname;
  const base = path.basename(pathname) || "asset";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function remotePathFor(url) {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 12);
  return `remote/${hash}-${sanitizeBasename(url)}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }
  const text = await response.text();
  return JSON.parse(text);
}

async function safeFetchJson(url, fallback) {
  try {
    return await fetchJson(url);
  } catch (error) {
    console.warn(`Skipping ${url}: ${error.message}`);
    return fallback;
  }
}

async function downloadAsset(url) {
  if (!url) {
    return "";
  }

  const absolute = absoluteUrl(url);
  if (downloadCache.has(absolute)) {
    return downloadCache.get(absolute);
  }

  const targetRel = remotePathFor(absolute);
  const targetAbs = path.join(assetsDir, targetRel);
  downloadCache.set(absolute, targetRel);

  try {
    const response = await fetch(absolute, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      downloadCache.set(absolute, absolute);
      return absolute;
    }

    const arrayBuffer = await response.arrayBuffer();
    await writeFile(targetAbs, Buffer.from(arrayBuffer));
    return targetRel;
  } catch {
    downloadCache.set(absolute, absolute);
    return absolute;
  }
}

async function processImageField(markup) {
  const src = extractImageSrc(markup);
  return src ? downloadAsset(src) : "";
}

async function processPhoto(basePath, fileLeafRef) {
  return downloadAsset(absoluteUrl(`${basePath}/${fileLeafRef}`));
}

async function processVideoThumb(item) {
  const explicit = extractImageSrc(item.PublishingRollupImage);
  if (explicit) {
    return downloadAsset(explicit);
  }

  const url = item.URL || "";
  const youtubeMatch = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (youtubeMatch) {
    return downloadAsset(`https://img.youtube.com/vi/${youtubeMatch[1]}/0.jpg`);
  }

  return "";
}

async function fetchVotingData() {
  try {
    const current = await fetchJson(votingCurrentUrl);
    const result = await fetchJson(
      `${endpointBase}/VotingHandler.ashx?op=getResult&aList=/Admin/Lists/VotingAnswers&qId=${current.Question.ID}`,
    );
    const totalVotes = result.Answers.reduce((sum, item) => sum + Number(item.NumberOfAnswers || 0), 0);

    return {
      ar: {
        question: decodeEntities(current.Question.TitleAr || current.Question.Title),
        answers: result.Answers.map((answer) => {
          const votes = Number(answer.NumberOfAnswers || 0);
          return {
            title: decodeEntities(answer.TitleAr || answer.Title),
            votes,
            percent: totalVotes ? Math.round((votes / totalVotes) * 100) : 0,
          };
        }),
      },
      en: {
        question: decodeEntities(current.Question.Title || current.Question.TitleAr),
        answers: result.Answers.map((answer) => {
          const votes = Number(answer.NumberOfAnswers || 0);
          return {
            title: decodeEntities(answer.Title || answer.TitleAr),
            votes,
            percent: totalVotes ? Math.round((votes / totalVotes) * 100) : 0,
          };
        }),
      },
    };
  } catch {
    return { ar: null, en: null };
  }
}

async function fetchLangData(lang, votingByLang, survey) {
  const { basePath } = langConfig[lang];
  const callsList = "/ar/Lists/CallCenter";
  const urls = {
    menu: `${endpointBase}/PortalHandler.ashx?op=getMenu&listUrl=${basePath}/Lists/TopMenuLevel1&viewName=Home&subList=${basePath}/Lists/TopMenuLevel2`,
    headerSocial: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/Lists/SocialLinks&viewName=HeaderLinks`,
    footer: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/Lists/Footer&viewName=Home`,
    banners: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/Lists/TopBanners&viewName=Home`,
    steps: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/Lists/CasesProcessSteps&viewName=Home`,
    stats: `${endpointBase}/PortalHandler.ashx?op=GetCasesAndCallsData&listUrl=${callsList}`,
    news: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/MediaCenter/News/Pages&viewName=Home`,
    images: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/MediaCenter/Photos/PublishingImages&viewName=Home`,
    videos: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/MediaCenter/Videos/Lists/Videos&viewName=Home`,
    importantLinks: `${endpointBase}/PortalHandler.ashx?op=LoadItems&listUrl=${basePath}/PortalServices/ImportantLinks/Lists/ImportantLinks&viewName=Home`,
  };

  const [menu, headerSocial, footer, banners, steps, statistics, news, images, videos, importantLinks] =
    await Promise.all([
      safeFetchJson(urls.menu, []),
      safeFetchJson(urls.headerSocial, []),
      safeFetchJson(urls.footer, []),
      safeFetchJson(urls.banners, []),
      safeFetchJson(urls.steps, []),
      safeFetchJson(urls.stats, {}),
      safeFetchJson(urls.news, []),
      safeFetchJson(urls.images, []),
      safeFetchJson(urls.videos, []),
      safeFetchJson(urls.importantLinks, []),
    ]);

  return {
    menu: menu.map((entry) => ({
      Item: {
        ...entry.Item,
        Title: decodeEntities(entry.Item.Title),
        URL: absoluteUrl(entry.Item.URL),
      },
      SubItem: Array.isArray(entry.SubItem)
        ? entry.SubItem.map((subItem) => ({
            ...subItem,
            Title: decodeEntities(subItem.Title),
            URL: absoluteUrl(subItem.URL),
          }))
        : null,
    })),
    headerSocial: headerSocial.map((item) => ({
      ...item,
      Title: decodeEntities(item.Title),
      URL: absoluteUrl(item.URL),
    })),
    footer: footer.map((item) => ({
      ...item,
      Title: decodeEntities(item.Title),
      URL: absoluteUrl(item.URL),
    })),
    banners: await Promise.all(
      banners.map(async (item) => ({
        ...item,
        Title: decodeEntities(item.Title),
        URL: absoluteUrl(item.URL),
        image: await processImageField(item.PublishingRollupImage),
      })),
    ),
    steps: await Promise.all(
      steps.map(async (item) => ({
        ...item,
        Title: decodeEntities(item.Title),
        _Comments: decodeEntities(item._Comments),
        URL: absoluteUrl(item.URL),
        image: await processImageField(item.PublishingRollupImage),
      })),
    ),
    statistics,
    newsLandingUrl: absoluteUrl(`${basePath}/MediaCenter/News/`),
    news: await Promise.all(
      news.map(async (item) => ({
        ...item,
        Title: decodeEntities(item.Title),
        URL: absoluteUrl(`${basePath}/MediaCenter/News/Pages/${item.FileLeafRef}`),
        image: await processImageField(item.PublishingRollupImage),
      })),
    ),
    imagesLandingUrl: absoluteUrl(`${basePath}/MediaCenter/Photos/`),
    images: await Promise.all(
      images.map(async (item) => {
        const image = await processPhoto(`${basePath}/MediaCenter/Photos/PublishingImages`, item.FileLeafRef);
        return {
          ...item,
          Title: decodeEntities(item.Title),
          image,
          fullImageUrl: absoluteUrl(`${basePath}/MediaCenter/Photos/PublishingImages/${item.FileLeafRef}`),
        };
      }),
    ),
    videosLandingUrl: absoluteUrl(`${basePath}/MediaCenter/Videos/`),
    videos: await Promise.all(
      videos.map(async (item) => ({
        ...item,
        Title: decodeEntities(item.Title),
        URL: absoluteUrl(item.URL),
        image: await processVideoThumb(item),
      })),
    ),
    importantLinks: await Promise.all(
      importantLinks.map(async (item) => ({
        ...item,
        Title: decodeEntities(item.Title),
        URL: absoluteUrl(item.URL),
        image: await processImageField(item.PublishingRollupImage),
      })),
    ),
    survey: survey
      ? {
          title: decodeEntities(lang === "ar" ? survey.ArTitle : survey.EnTitle),
          URL: absoluteUrl(`${basePath}/PortalServices/survey/Pages/questions.aspx?SurveyId=${survey.SurveyId}`),
        }
      : null,
    voting: votingByLang[lang],
  };
}

function extractBodyFragment(sourceHtml) {
  const start = sourceHtml.indexOf('<header class="header">');
  const bodyClose = sourceHtml.lastIndexOf("</body>");
  const footerEnd = sourceHtml.lastIndexOf("</footer>");

  let end = footerEnd >= 0 ? footerEnd + "</footer>".length : bodyClose;

  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not extract main body fragment from source HTML");
  }

  return sourceHtml.slice(start, end);
}

function normalizeFragment(fragment, lang) {
  let value = fragment;

  if (lang === "en") {
    value = value.replaceAll("../../", "../");
    value = value.replaceAll("default.aspx.html", "index.html");
  } else {
    value = value.replaceAll('href="index.html#!"', 'href="#!"');
  }

  return value;
}

function renderHtml({ lang, bodyFragment }) {
  const cfg = langConfig[lang];
  const alternateHome = lang === "ar" ? "en/index.html" : "../index.html";

  return `<!DOCTYPE html>
<html lang="${cfg.langAttr}" dir="${cfg.dir}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${cfg.pageTitle}</title>
  <link rel="shortcut icon" href="${lang === "ar" ? "Style%20Library/GSTC/images/favicon.png" : "../Style%20Library/GSTC/images/favicon.png"}" type="image/png">
  <link rel="alternate" href="${alternateHome}" hreflang="${lang === "ar" ? "en-US" : "ar-SA"}">
  <link rel="stylesheet" href="${cfg.cssPrefix}/helpers.min.css">
  <link rel="stylesheet" href="${cfg.cssPrefix}/remodal.css">
  <link rel="stylesheet" href="${cfg.cssPrefix}/remodal-default-theme.css">
  <link rel="stylesheet" href="${cfg.cssPrefix}/custom.css">
  ${lang === "en" ? `<link rel="stylesheet" href="${cfg.cssPrefix}/custom_en.css">` : ""}
  <link rel="stylesheet" href="${cfg.htmlAssetPrefix}app.css">
</head>
<body>
${bodyFragment}
<script src="${cfg.htmlAssetPrefix}data.js"></script>
<script src="${cfg.htmlAssetPrefix}app.js"></script>
</body>
</html>`;
}

async function build() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(remoteDir, { recursive: true });
  await mkdir(path.join(outDir, "en"), { recursive: true });

  await cp(path.join(cwd, "Style Library"), path.join(outDir, "Style Library"), { recursive: true });
  await cp(path.join(cwd, "ar/PublishingImages"), path.join(outDir, "ar/PublishingImages"), { recursive: true });

  const data = staticMirrorData;

  await writeFile(path.join(assetsDir, "data.js"), `window.ZATCA_MIRROR_DATA = ${JSON.stringify(data, null, 2)};\n`);
  await cp(path.join(cwd, "scripts/static-app.js"), path.join(assetsDir, "app.js"));
  await cp(path.join(cwd, "scripts/static-app.css"), path.join(assetsDir, "app.css"));

  for (const lang of Object.keys(langConfig)) {
    const sourceHtml = await readFile(langConfig[lang].sourceHtml, "utf8");
    const bodyFragment = normalizeFragment(extractBodyFragment(sourceHtml), lang);
    await writeFile(langConfig[lang].outputHtml, renderHtml({ lang, bodyFragment }));
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
