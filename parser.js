import axios from "axios";
import fs from "fs";
import https from "https";
import jsdom from "jsdom";
import iconv from "iconv-lite";
import { parsingDom } from "./text_extractor.js";
import { formTask } from "./task_former.js";

const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

// Читаем цепочку сертификатов
const fipi_certif_chain = fs.readFileSync("./certificates/fipi-ru-chain.pem");

//aka question kinds
const qkinds = [
  // "ILI_STD_SELECTN", // выбор ответов из предложенных вариантов
  // "ILI_STD_SHORT", // краткий ответ
  "ILI_EXT_SEQUENCE", //последовательность
  // "ILI_STD_FULL", // развернутый ответ - пока закоментил, потому что там нужно еще подгружать изображения и проч., а для этого нужно опять лезть в запросы фипи
  "ILI_EXT_DISTRIB", // распределение
  // "ILI_EXT_TXTPARTCHOICE", // расстановка терминов - coming soon
  "ILI_EXT_ACCORD", // установление соответсвия
];

const agent = new https.Agent({
  ca: fipi_certif_chain, // Передаем цепочку сертификатов
});
const baseURL = "https://ege.fipi.ru/bank/questions.php";
const axiosConfig = {
  httpsAgent: agent,
  headers: {
    Accept: "*/*",
    User_Agent: "Mozilla/5.0",
    "Accept-Encoding": "gzip, deflate, br",
  },
  params: {
    proj: "068A227D253BA6C04D0C832387FD0D89",
    // page: 1,
    search: 1,
    pagesize: 10,
    init_filter_themes: 1,
    qkind: "",
    theme: "",
    qlevel: "",
    qsstruct: "",
    qpos: "",
    qid: "",
    zid: "",
    solved: ",",
    favorite: "",
    blind: "",
  },
  responseType: "arraybuffer",
};

const getTasks = async (url, config) => {
  try {
    const response = await axios.get(url, config);
    //fipi has charset windows-1251
    const decodedData = iconv.decode(
      Buffer.from(response.data),
      "windows-1251"
    );
    return decodedData;
  } catch (error) {
    if (error.response) {
      console.log("Ошибка ответа сервера:", error.response.status);
      console.log(error.response.data);
    } else if (error.request) {
      console.log("Сервер не ответил:", error.request);
    } else {
      console.log("Ошибка запроса:", error.message);
    }
  }
};

const getTasksNumber = async () => {
  // получаем страницу с вопросами выбранного раздела
  const task_page = await getTasks(baseURL, axiosConfig);

  const dom = new JSDOM(task_page);
  const document = dom.window.document;

  // получаем количество заданий в выбранном разделе - они хранятся в тэге script функции setQCount
  const scripts = document.querySelectorAll("script[type='text/javascript']");
  return parseTasksNumber(scripts);
};

const parseTasksNumber = (scripts) => {
  for (let script of scripts) {
    const match = script.textContent.match(/setQCount\((\d+)\)/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
};

const getAllTasks = async (section) => {
  axiosConfig.params.qkind = section;
  const taskNumber = await getTasksNumber();
  axiosConfig.params.qkind = section;
  axiosConfig.params.pagesize = taskNumber;
  const tasks = await getTasks(baseURL, axiosConfig);
  return tasks;
};

const parsing = (page) => {
  const selector = ".qblock"; //selector of the element where main info is stored

  const dom = new JSDOM(page);
  const document = dom.window.document;
  const tasks = document.querySelectorAll(selector);
  const tasksText = [];

  tasks.forEach((task) => {
    const parsedTask = parsingDom(task);
    tasksText.push(formTask(parsedTask));
  });
  return tasksText;
};

const saveTasks = async (section) => {
  const page = await getAllTasks(section);
  const tasksText = parsing(page);
  const fipiTasks = [];
  tasksText.forEach((text, index) => {
    fipiTasks.push({
      id: index,
      task_text: text,
    });
  });

  fs.writeFileSync(`history_${section}.json`, JSON.stringify(fipiTasks));
};

qkinds.forEach(async (section) => {
  await saveTasks(section);
});
