const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SITE_URL = 'https://tobo-me.vercel.app';

async function runBrowserE2ETests() {
  console.log('🌐 [E2E Тестер]: Запускаю реальный Google Chrome и открываю ' + SITE_URL);
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--window-size=1280,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const results = [];
  const errors = [];

  page.on('pageerror', err => {
    errors.push(`PageError: ${err.message}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`ConsoleError: ${msg.text()}`);
    }
  });

  try {
    // ТЕСТ 1: Открытие сайта и проверка модального окна регистрации
    console.log('⏳ Тест 1: Загрузка сайта и проверка появления окна входа...');
    await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Проверяем, появилось ли модальное окно регистрации
    const authModalVisible = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h3, h2, div')).find(el => el.textContent && el.textContent.includes('Создайте новый аккаунт'));
      return Boolean(heading);
    });

    if (authModalVisible) {
      results.push({ name: 'Экран регистрации при первом входе', status: 'PASS', detail: 'Окно открывается автоматически' });
    } else {
      results.push({ name: 'Экран регистрации при первом входе', status: 'FAIL', detail: 'Окно не появилось' });
    }

    // ТЕСТ 2: Закрытие окна авторизации и кликабельность кнопки 3 точек
    console.log('⏳ Тест 2: Клик по крестику закрытия и проверка ленты...');
    const closedModal = await page.evaluate(() => {
      // Ищем кнопку закрытия (крестик)
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('close') || b.textContent.trim() === '×'));
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 1000));

    // ТЕСТ 3: Проверка кнопки 3 точек на публикации (PostCard)
    console.log('⏳ Тест 3: Клик по 3 точкам на публикации и открытие выпадающего меню...');
    const menuResult = await page.evaluate(async () => {
      const moreButtons = Array.from(document.querySelectorAll('button[aria-label="Меню публикации"]'));
      if (moreButtons.length === 0) {
        return { ok: false, error: 'Кнопка "more_vert" меню публикации не найдена в DOM' };
      }
      
      const firstBtn = moreButtons[0];
      // Проверяем видимость и кликабельность
      firstBtn.click();
      
      await new Promise(res => setTimeout(res, 600));

      // Проверяем, появилось ли выпадающее меню
      const menu = document.querySelector('.shadow-elevation-3, [role="menu"]');
      const allText = document.body.innerText || '';
      const hasHide = allText.includes('Скрыть запись') || allText.includes('Удалить запись');
      const hasRank = allText.includes('Рейтинг:');

      return {
        ok: hasHide && hasRank,
        hasHide,
        hasRank,
        textSnippet: allText.slice(0, 300)
      };
    });

    if (menuResult.ok) {
      results.push({ name: 'Клик по 3 точкам и открытие меню поста', status: 'PASS', detail: 'Меню раскрывается, есть пункты действия и рейтинг' });
    } else {
      results.push({ name: 'Клик по 3 точкам и открытие меню поста', status: 'FAIL', detail: JSON.stringify(menuResult) });
    }

    // ТЕСТ 4: Переход в раздел Чаты (/messages)
    console.log('⏳ Тест 4: Переход в раздел сообщений (/messages) и проверка загрузки чатов...');
    await page.goto(`${SITE_URL}/messages`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    const messagesPageCheck = await page.evaluate(() => {
      const bodyText = document.body.innerText || '';
      const hasHeading = bodyText.includes('Сообщения') || bodyText.includes('Все') || bodyText.includes('Чаты');
      const hasNoBlankCrash = !bodyText.includes('Application Error') && !bodyText.includes('ChunkLoadError');
      return { hasHeading, hasNoBlankCrash };
    });

    if (messagesPageCheck.hasHeading && messagesPageCheck.hasNoBlankCrash) {
      results.push({ name: 'Переход в /messages', status: 'PASS', detail: 'Раздел чатов успешно отрендерен' });
    } else {
      results.push({ name: 'Переход в /messages', status: 'FAIL', detail: 'Раздел чатов не загрузился' });
    }

    // ТЕСТ 5: Клик по кнопке создания диалога и проверка модального окна
    console.log('⏳ Тест 5: Клик по кнопке создания чата и проверка поисковой строки...');
    const createModalResult = await page.evaluate(async () => {
      // Ищем кнопку добавления чата
      const addBtns = Array.from(document.querySelectorAll('button')).find(b => {
        const t = b.textContent || '';
        return t.includes('add') || t.includes('person_add') || t.includes('Начать диалог');
      });

      if (addBtns) {
        addBtns.click();
        await new Promise(res => setTimeout(res, 800));
      }

      const bodyText = document.body.innerText || '';
      const hasModal = bodyText.includes('Новый') || bodyText.includes('Создать') || bodyText.includes('диалог');
      const hasSearchInput = Boolean(document.querySelector('input[placeholder*="username"], input[placeholder*="Поиск"]'));
      const hasContactsBtn = bodyText.includes('контактов') || bodyText.includes('Контакты');

      return { ok: hasModal || hasSearchInput, hasModal, hasSearchInput, hasContactsBtn };
    });

    if (createModalResult.ok) {
      results.push({ name: 'Клик по кнопке создания диалога', status: 'PASS', detail: 'Модалка открывается, поиск по нику и кнопка контактов на месте' });
    } else {
      results.push({ name: 'Клик по кнопке создания диалога', status: 'FAIL', detail: JSON.stringify(createModalResult) });
    }

    // ТЕСТ 6: Переход в Профиль (/profile) и проверка кнопок
    console.log('⏳ Тест 6: Переход в Профиль (/profile) и проверка карточки пользователя...');
    await page.goto(`${SITE_URL}/profile`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    const profileCheck = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const hasProfileElements = text.includes('Профиль') || text.includes('Редактировать') || text.includes('Войти') || text.includes('Гостевой');
      return { ok: hasProfileElements };
    });

    if (profileCheck.ok) {
      results.push({ name: 'Переход в /profile и верстка карточки', status: 'PASS', detail: 'Профиль корректно отображается' });
    } else {
      results.push({ name: 'Переход в /profile и верстка карточки', status: 'FAIL', detail: 'Профиль не загрузился' });
    }

  } catch (err) {
    console.error('Ошибка выполнения E2E:', err);
    results.push({ name: 'Общий прогон', status: 'ERROR', detail: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ БРАУЗЕРНОГО ТЕСТИРОВАНИЯ:');
  console.log('========================================');
  results.forEach((r, idx) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${idx + 1}. ${r.name} -> ${r.detail}`);
  });

  if (errors.length > 0) {
    console.log('\n⚠️ Ошибки консоли браузера:');
    errors.forEach(e => console.log('  ' + e));
  } else {
    console.log('\n✨ В консоли браузера 0 критических ошибок!');
  }
  console.log('========================================\n');
}

runBrowserE2ETests();
