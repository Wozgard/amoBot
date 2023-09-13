import TelegramBot from 'node-telegram-bot-api';
import { Client } from 'amocrm-js';
import dotenv from 'dotenv';

dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN;

const amoCRMClient = new Client({
  domain: process.env.AMO_DOMAIN, // Домен вашего аккаунта amoCRM
  auth: {
    client_id: process.env.AMO_CLIENT_ID, // ID интеграции
    client_secret: process.env.AMO_CLIENT_SECRET, // Секретный ключ интеграции
    redirect_uri: process.env.AMO_REDIRECT_URI, // Адрес перенаправления
  },
});

// Инициализируем Telegram бот
const bot = new TelegramBot(telegramToken, { polling: true });

// Слушаем входящие сообщения от пользователя
bot.on('message', (msg) => {
  const messageText = msg.text;
  const chatId = msg.chat.id;

  // Парсим информацию из сообщения (пример парсинга)
  const parsedInfo = parseMessage(messageText);

  // Создаем сделку в amoCRM
  createDealContactCompanyInAmoCRM(parsedInfo)
    .then(() => {
      // Отправляем ответное сообщение в Телеграм об успешном создании сделки
      bot.sendMessage(chatId, 'Сделка успешно создана в amoCRM');
    })
    .catch((error) => {
      console.error(error);
      bot.sendMessage(chatId, 'Произошла ошибка при создании сделки в amoCRM');
    });
});


/**
 * Функция для парсинга информации из сообщения Telegram
 * @param message - текст сообщения из тг
 */
function parseMessage(message) {
  // Здесь вы должны написать код для извлечения информации из сообщения
  // Пример: разделить сообщение на строки и извлечь нужные поля
  const lines = message.split('\n');
  const founder = lines[0].replace('founder: ', '');
  const about = lines[1].replace('about: ', '');
  // И так далее...

  return {
    founder,
    about,
    // Добавьте остальные поля, которые вам нужны
  };
}

/**
 * Функция для создания сделки, контакта и компании в amoCRM
 * @param data - объект собранный из парсинга сообщения из тг
 */
async function createDealContactCompanyInAmoCRM(data) {
  const companyFactory = amoCRMClient.company;
  const contactFactory = amoCRMClient.contact;

  const companyData = {
    name: 'Название компании', // Название вашей компании
    // Другие поля компании, если необходимо
  };

  const contactData = {
    name: 'Имя контакта', // Имя контактного лица
    // Другие поля контакта, если необходимо
  };

  const company = await companyFactory.create(companyData);
  const contact = await contactFactory.create(contactData);

  const leadFactory = amoCRMClient.lead;

  const leadData = {
    name: 'Название сделки', // Название вашей сделки
    // Другие поля сделки, если необходимо
  };

  // Привяжем контакт и компанию к сделке
  leadData.contacts = [contact.id];
  leadData.company = company.id;

  const lead = await leadFactory.create(leadData);

  console.log(lead)
}

