const LANG = (document.documentElement.lang || 'ru').slice(0,2);
const T = {
  ru: { reveal: 'Простыми словами ↓', collapse: 'Свернуть ↑',
        saved: '<b>Заявка сформирована.</b> Текст ниже сохранён в этом браузере.',
        nosave: '<b>Заявка сформирована.</b> Локальное сохранение недоступно — браузер его блокирует. Скопируйте текст сейчас, иначе он потеряется при закрытии страницы.' },
  en: { reveal: 'In plain words ↓', collapse: 'Collapse ↑',
        saved: '<b>Application ready.</b> The text below is saved in this browser.',
        nosave: '<b>Application ready.</b> Local saving is blocked by the browser. Copy the text now, otherwise it will be lost when you close the page.' },
  ka: { reveal: 'მარტივი სიტყვებით ↓', collapse: 'ჩაკეცვა ↑',
        saved: '<b>განაცხადი მზადაა.</b> ტექსტი ამ ბრაუზერში შენახულია.',
        nosave: '<b>განაცხადი მზადაა.</b> ბრაუზერი ლოკალურ შენახვას ბლოკავს. დააკოპირეთ ტექსტი ახლა, თორემ გვერდის დახურვისას დაიკარგება.' }
};
const L = T[LANG] || T.ru;

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
      btn.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        btn.textContent = '☰';
      });
    });
  }

  document.querySelectorAll('.explain, .glossary').forEach((box) => {
    box.hidden = true;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'js-reveal';
    btn.textContent = L.reveal;
    btn.setAttribute('aria-expanded', 'false');
    box.parentNode.insertBefore(btn, box);
    btn.addEventListener('click', () => {
      const willOpen = box.hidden;
      box.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
      btn.textContent = willOpen ? L.collapse : L.reveal;
    });
  });

  document.querySelectorAll('.js-toggle').forEach((btn) => {
    const list = document.getElementById(btn.dataset.target);
    if (!list) return;
    btn.addEventListener('click', () => {
      const willOpen = list.hasAttribute('hidden');
      if (willOpen) { list.removeAttribute('hidden'); }
      else { list.setAttribute('hidden', ''); }
      btn.setAttribute('aria-expanded', String(willOpen));
      btn.textContent = willOpen ? btn.dataset.less : btn.dataset.more;
    });
  });

  const form = document.getElementById('applyForm');
  if (!form) return;
  const note = document.getElementById('formNote');

  // Прототип: почта акселератора не подключена. Заявка формируется и сохраняется в браузере.
  const makeText = (get) => [
    'Имя: ' + get('name'),
    'Роль: ' + get('role'),
    'Почта: ' + get('email'),
    'Telegram: ' + get('tg'),
    'Страна и город: ' + get('country'),
    'Стадия: ' + get('stage'),
    'Ссылка: ' + (get('link') || '—'),
    '',
    'Описание:',
    get('desc')
  ].join('\n');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const get = (k) => (d.get(k) || '').toString().trim();
    const missing = ['name', 'role', 'email', 'tg', 'country', 'stage', 'desc']
      .filter((k) => !get(k));
    if (missing.length) {
      note.innerHTML = '<div class="note">Заполните обязательные поля: ' + missing.join(', ') + '</div>';
      return;
    }

    const body = makeText(get);

    let saved = true;
    try {
      const key = 'khidi-applications';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ at: new Date().toISOString(), body: body });
      localStorage.setItem(key, JSON.stringify(list.slice(-5)));
    } catch (err) {
      saved = false;
    }

    const savedLine = saved
      ? L.saved
      : L.nosave;

    note.innerHTML =
      '<div class="note">' + savedLine +
      '<br><br>Прототип: отправка на почту акселератора не подключена — адрес появится после регистрации домена.' +
      '<br><br><textarea id="draftText" readonly></textarea>' +
      '<button class="btn btn-dark" type="button" id="copyBtn" style="margin-top:10px">Скопировать заявку</button>' +
      '<div class="hint">Сохранённые в браузере заявки: <button class="btn btn-dark" type="button" id="clearBtn" style="padding:6px 12px;font-size:12.5px">очистить</button></div></div>';

    const ta = document.getElementById('draftText');
    if (ta) ta.value = body;

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        try { localStorage.removeItem('khidi-applications'); } catch (err) {}
        clearBtn.textContent = 'очищено';
      });
    }

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(body);
          copyBtn.textContent = 'Скопировано';
        } catch (err) {
          if (ta) {
            ta.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Скопировано';
          } else {
            copyBtn.textContent = 'Выделите текст вручную';
          }
        }
      });
    }
  });
});
