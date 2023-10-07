import TelegramBot from "node-telegram-bot-api";
import { Client } from "amocrm-js";
import dotenv from "dotenv";
import { getContantFields } from "./contact_castom_feilds.js";

dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN;

const amoCRMClient = new Client({
  domain: process.env.AMO_DOMAIN, // Домен вашего аккаунта amoCRM
  auth: {
    client_id: process.env.AMO_CLIENT_ID, // ID интеграции
    client_secret: process.env.AMO_CLIENT_SECRET, // Секретный ключ интеграции
    redirect_uri: process.env.AMO_REDIRECT_URI, // Адрес перенаправления
    code: process.env.AMO_CODE, // Код из авторизации из вашей интеграции
  },
});
// Инициализируем Telegram бот
const bot = new TelegramBot(telegramToken, { polling: true });

bot.on("polling_error", console.log);

const messageTemplate =
"*founder name:* \n*about founder:* \n*company name:* \n*about company:* \n*web:* \n*TG:* \n*link LD:* \n*founder position:* \n*CB:* \n*stage:* \n*amount:* \n*date funding:* \n*problem:* \n*email:* \n*where founder's money comes from:* \n*where company's money comes from:* \n*where info about problem comes from:* \n*inst:* \n📍 ";

// Слушаем входящие сообщения от пользователя
bot.on("message", (msg) => {
  const messageText = msg.text;
  const chatId = msg.chat.id;

  if (messageText !== "/start") {
    // Парсим информацию из сообщения (пример парсинга)
    const parsedInfo = parseMessage(messageText);

    if (parsedInfo.isSuccess) {
      // Создаем сделку в amoCRM
      createDealContactCompanyInAmoCRM(parsedInfo)
        .then(() => {
          // Отправляем ответное сообщение в Телеграм об успешном создании сделки
          bot.sendMessage(chatId, "Сделка успешно создана в amoCRM");
        })
        .catch((error) => {
          console.error(error);
          bot.sendMessage(
            chatId,
            "Произошла ошибка при создании сделки в amoCRM"
          );
        });
    }
    else {
      bot.sendMessage(
        chatId,
        `Твой запрос неправильный, проверь еще раз. Он должен включать в себя все строчки из шаблона, пункты можно оставлять не заполненными`
      );

      bot.sendMessage(chatId, `${messageTemplate}`, { parse_mode: "Markdown" });
    }
  } else {
    bot.sendMessage(
      chatId,
      `Тебя приветствует амоБот. Отправь мне сообщеньку, пример которой ниже и я создам новую сделку в amoCRM`
    );
    bot.sendMessage(chatId, `${messageTemplate}`, { parse_mode: "Markdown" });
  }
});

/**
 * Функция для парсинга информации из сообщения Telegram
 * @param message - текст сообщения из тг
 */
function parseMessage(message) {
  const lines = message.split("\n");
  if (lines.length > 1) {
    try {
      const founder = lines[0].replace("founder name: ", "");
      const aboutFounder = lines[1].replace("about founder: ", "");
      const companyName = lines[2].replace("company name: ", "");
      const aboutCompany = lines[3].replace("about company: ", "");
      const web = lines[4].replace("web: ", "");
      const tg = lines[5].replace("TG: ", "");
      const ld = lines[6].replace("link LD: ", "");
      const position = lines[7].replace("founder position: ", "");
      const cb = lines[8].replace("CB: ", "");
      const stage = lines[9].replace("stage: ", "");
      const amount = lines[10].replace("amount: ", "");
      const dateFunding = lines[11].replace("date funding: ", "");
      const problem = lines[12].replace("problem: ", "");
      const email = lines[13].replace("email: ", "");
      const whereMoneyFounder = lines[14].replace(
        "where founder's money comes from: ",
        ""
      );
      const whereMoneyCompany = lines[15].replace(
        "where company's money comes from: ",
        ""
      );
      const whereInfo = lines[16].replace(
        "where info about problem comes from: ",
        ""
      );
      const inst = lines[17].replace("inst: ", "");
      const whereFrom = lines[18].replace("📍 ", "");

      const companyData = {
        name: companyName,
        custom_fields_values: [
          {
            field_id: 697953,
            field_name: "Web",
            field_code: "WEB",
            field_type: "url",
            values: [{ value: web }],
          },
          {
            field_id: 983307,
            field_name: "About company",
            field_code: null,
            field_type: "text",
            values: [{ value: aboutCompany }],
          },
        ],
      };

      const contactData = {
        name: founder,
        custom_fields_values: getContantFields(
          tg,
          position,
          stage,
          amount,
          dateFunding,
          aboutFounder,
          whereFrom,
          ld,
          cb,
          problem,
          email,
          whereMoneyFounder,
          whereMoneyCompany,
          inst,
          whereInfo
        ),
      };

      const leadData = {
        name: companyName,
      };

      return { isSuccess: true, companyData, contactData, leadData };
    } catch {
      return {
        isSuccess: false,
        companyData: {},
        contactData: {},
        leadData: {},
      };
    }
  }
}

/**
 * Функция для создания сделки, контакта и компании в amoCRM
 * @param data - объект собранный из парсинга сообщения из тг, включающий в себя 3 объекта с данными: companyData, contactData, leadData
 */
async function createDealContactCompanyInAmoCRM(data) {
  /**
   * Создаем компанию в amoCRM
   */
  const company = new amoCRMClient.Company(data.companyData);
  await company.save();

  /**
   * Создаем контакт в amoCRM и связываем с компанией
   */
  const contact = new amoCRMClient.Contact(data.contactData);
  contact.embeddedCompanies.add([company]);
  await contact.save();

  /**
   * После успешного создания контакта и компании
   * создаем сделку в amoCRM и связываем с компанией и контактом
   */
  if (contact.id && company.id) {
    const lead = new amoCRMClient.Lead({
      name: data.leadData.name,
    });

    lead.embeddedContacts.add([contact]);
    lead.embeddedCompanies.add([company]);
    await lead.save();
    console.log(lead);
  }
}
