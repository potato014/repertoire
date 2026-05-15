// デバイス検出: スマホ/タブレットなら body に 'mobile-device' クラスを追加
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobileDevice()) {
  document.body.classList.add('mobile-device');
}
function getYouTubeId(url) {
  // v=ID 形式 or youtu.be/ID 形式両対応
  let match = url.match(/[?&]v=([\w-]+)/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([\w-]+)/);
  if (match) return match[1];
  return '';
}
function getYouTubeThumbnail(url) {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].replace(/\r/g, '').split(',');
  return lines.slice(1).map(line => {
    const cols = line.replace(/\r/g, '').split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] || '');
    return obj;
  });
}

// 変更前CSV（タイトル,アーティスト,カテゴリ,YouTube）にも対応できるように、
// カラム名がなければ従来のカラム名で処理するようにする
function getSongField(song, key) {
  // 新CSV
  if (key === 'リンク' && song['リンク']) return song['リンク'];
  if (key === '作品名' && song['作品名']) return song['作品名'];
  if (key === 'ジャンル' && song['ジャンル']) return song['ジャンル'];
  // 旧CSV
  if (key === 'リンク' && song['YouTube']) return song['YouTube'];
  if (key === '作品名' && song['カテゴリ']) return song['カテゴリ'];
  if (key === 'ジャンル' && song['カテゴリ']) return song['カテゴリ'];
  return song[key] || '';
}

function getUniqueValues(songs, key) {
  return [...new Set(songs.map(song => song[key]).filter(Boolean))];
}

function getUniqueValuesMulti(songs, key) {
  const set = new Set();
  songs.forEach(song => {
    if (song[key]) {
      song[key].split('、').forEach(val => {
        const trimmed = val.trim();
        if (trimmed) set.add(trimmed);
      });
    }
  });
  return [...set];
}

function getGenreCounts(songs) {
  const counts = {};
  songs.forEach(song => {
    if (song['ジャンル']) {
      song['ジャンル'].split('、').forEach(val => {
        const genre = val.trim();
        if (!genre) return;
        counts[genre] = (counts[genre] || 0) + 1;
      });
    }
  });
  return counts;
}

function sortGenreValues(genreValues, counts) {
  const groupA = ['アニソン', 'アイドル', 'J-POP', 'ドラマ', '邦ロック', 'ボカロ', '声優', '演歌', '昭和歌謡', '洋楽', 'K-POP'];
  const groupB = ['アイマス', 'デレマス', '学マス'];
  const groupC = ['ハロプロ', 'VTuber • Vsinger', 'プリキュア', 'ラブライブ！', 'ナナシス', 'ディズニー', 'サンリオ'];
  const groupsSet = new Set([...groupA, ...groupB, ...groupC]);

  const availableSet = new Set(genreValues);
  const groupAList = groupA.filter(g => availableSet.has(g)).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  const groupBList = groupB.filter(g => availableSet.has(g));
  const groupCList = groupC.filter(g => availableSet.has(g)).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  const remaining = genreValues
    .filter(g => !groupsSet.has(g))
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

  return [...groupAList, ...groupBList, ...groupCList, ...remaining];
}

function renderDropdownUI(songs) {
  const artistList = document.querySelector('#artistList');
  const workList = document.querySelector('#workList');
  artistList.innerHTML = '';
  workList.innerHTML = '';
  
  let artists = getUniqueValuesMulti(songs, 'アーティスト');
  let works = getUniqueValuesMulti(songs, '作品名');
  
  // 日本語五十音順でソート
  const collator = new Intl.Collator('ja');
  artists.sort((a, b) => collator.compare(a, b));
  works.sort((a, b) => collator.compare(a, b));
  
  // アーティストドロップダウン検索ボックス
  const artistSearchBox = document.createElement('input');
  artistSearchBox.type = 'text';
  artistSearchBox.className = 'dropdown-search';
  artistSearchBox.placeholder = '検索...';
  artistList.appendChild(artistSearchBox);
  
  // アーティストアイテムコンテナ
  const artistItemsContainer = document.createElement('div');
  artistItemsContainer.className = 'dropdown-items-container';
  artistList.appendChild(artistItemsContainer);
  
  artists.forEach(artist => {
    const label = document.createElement('label');
    label.className = 'dropdown-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = artist;
    input.name = 'artist-filter';
    input.addEventListener('change', () => {
      renderCards(songs, getSelectedGenre(), getSearchQuery(), getSelectedArtists(), getSelectedWorks());
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(artist));
    artistItemsContainer.appendChild(label);
  });
  
  artistSearchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('#artistList .dropdown-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? 'flex' : 'none';
    });
  });
  
  // 作品名ドロップダウン検索ボックス
  const workSearchBox = document.createElement('input');
  workSearchBox.type = 'text';
  workSearchBox.className = 'dropdown-search';
  workSearchBox.placeholder = '検索...';
  workList.appendChild(workSearchBox);
  
  // 作品名アイテムコンテナ
  const workItemsContainer = document.createElement('div');
  workItemsContainer.className = 'dropdown-items-container';
  workList.appendChild(workItemsContainer);
  
  works.forEach(work => {
    const label = document.createElement('label');
    label.className = 'dropdown-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = work;
    input.name = 'work-filter';
    input.addEventListener('change', () => {
      renderCards(songs, getSelectedGenre(), getSearchQuery(), getSelectedArtists(), getSelectedWorks());
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(work));
    workItemsContainer.appendChild(label);
  });
  
  workSearchBox.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('#workList .dropdown-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? 'flex' : 'none';
    });
  });
  
  const artistBtn = document.querySelector('#artistBtn');
  const workBtn = document.querySelector('#workBtn');

  const isMobileView = () => window.innerWidth <= 700;

  const closeDropdownsLocal = () => {
    artistList.classList.remove('open', 'fullscreen');
    workList.classList.remove('open', 'fullscreen');
    // 閉じるボタンを削除
    const closeBtns = document.querySelectorAll('.dropdown-close-btn');
    closeBtns.forEach(btn => btn.remove());
    // 背景を隠す
    dropdownBackdrop.style.display = 'none';
  };

  artistBtn.addEventListener('click', (event) => {
    artistList.classList.toggle('open');
    workList.classList.remove('open', 'fullscreen');
    if (isMobileView()) {
      artistList.classList.toggle('fullscreen', artistList.classList.contains('open'));
      if (artistList.classList.contains('fullscreen')) {
        dropdownBackdrop.style.display = 'block';
        // 閉じるボタンを追加
        let closeBtn = artistList.querySelector('.dropdown-close-btn');
        if (!closeBtn) {
          closeBtn = document.createElement('button');
          closeBtn.className = 'dropdown-close-btn';
          closeBtn.textContent = '✕ 閉じる';
          closeBtn.addEventListener('click', closeDropdownsLocal);
          artistList.insertBefore(closeBtn, artistList.firstChild);
        }
      } else {
        dropdownBackdrop.style.display = 'none';
        const closeBtn = artistList.querySelector('.dropdown-close-btn');
        if (closeBtn) closeBtn.remove();
      }
    } else {
      artistList.classList.remove('fullscreen');
      dropdownBackdrop.style.display = 'none';
      const closeBtn = artistList.querySelector('.dropdown-close-btn');
      if (closeBtn) closeBtn.remove();
    }
    event.stopPropagation();
  });
  
  workBtn.addEventListener('click', (event) => {
    workList.classList.toggle('open');
    artistList.classList.remove('open', 'fullscreen');
    if (isMobileView()) {
      workList.classList.toggle('fullscreen', workList.classList.contains('open'));
      if (workList.classList.contains('fullscreen')) {
        dropdownBackdrop.style.display = 'block';
        // 閉じるボタンを追加
        let closeBtn = workList.querySelector('.dropdown-close-btn');
        if (!closeBtn) {
          closeBtn = document.createElement('button');
          closeBtn.className = 'dropdown-close-btn';
          closeBtn.textContent = '✕ 閉じる';
          closeBtn.addEventListener('click', closeDropdownsLocal);
          workList.insertBefore(closeBtn, workList.firstChild);
        }
      } else {
        dropdownBackdrop.style.display = 'none';
        const closeBtn = workList.querySelector('.dropdown-close-btn');
        if (closeBtn) closeBtn.remove();
      }
    } else {
      workList.classList.remove('fullscreen');
      dropdownBackdrop.style.display = 'none';
      const closeBtn = workList.querySelector('.dropdown-close-btn');
      if (closeBtn) closeBtn.remove();
    }
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!artistList.contains(target) && !artistBtn.contains(target) &&
        !workList.contains(target) && !workBtn.contains(target)) {
      closeDropdownsLocal();
    }
  });

  window.addEventListener('resize', () => {
    if (!isMobileView()) {
      artistList.classList.remove('fullscreen');
      workList.classList.remove('fullscreen');
      dropdownBackdrop.style.display = 'none';
      // 閉じるボタン削除
      const closeBtns = document.querySelectorAll('.dropdown-close-btn');
      closeBtns.forEach(btn => btn.remove());
    }
  });
}

function getSelectedArtists() {
  return Array.from(document.querySelectorAll('input[name="artist-filter"]:checked')).map(cb => cb.value);
}

function getSelectedWorks() {
  return Array.from(document.querySelectorAll('input[name="work-filter"]:checked')).map(cb => cb.value);
}

function getSelectedGenre() {
  const activeBtn = document.querySelector('.tag-button.active');
  return activeBtn?.dataset.genre || '';
}

function renderFilterUI(songs) {

  const filterDiv = document.querySelector('#filterTags');
  filterDiv.innerHTML = '';
  const genreValues = sortGenreValues(getUniqueValuesMulti(songs, 'ジャンル'), getGenreCounts(songs));
  
  const allBtn = document.createElement('button');
  allBtn.className = 'tag-button active';
  allBtn.textContent = 'すべて';
  allBtn.dataset.genre = '';
  allBtn.addEventListener('click', () => {
    document.querySelectorAll('.tag-button').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    renderCards(songs, '', getSearchQuery(), getSelectedArtists(), getSelectedWorks());
  });
  filterDiv.appendChild(allBtn);
  
  genreValues.forEach(genre => {
    const btn = document.createElement('button');
    btn.className = 'tag-button';
    btn.textContent = genre;
    btn.dataset.genre = genre;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCards(songs, genre, getSearchQuery(), getSelectedArtists(), getSelectedWorks());
    });
    filterDiv.appendChild(btn);
  });
}

function getSearchQuery() {
  return document.querySelector('#searchBox').value.toLowerCase();
}

function clearAllFilters(songs) {
  const searchBox = document.querySelector('#searchBox');
  searchBox.value = '';
  document.querySelectorAll('#artistList, #workList').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('input[name="artist-filter"], input[name="work-filter"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('#artistList .dropdown-search, #workList .dropdown-search').forEach(input => input.value = '');
  document.querySelectorAll('#artistList .dropdown-item, #workList .dropdown-item').forEach(item => item.style.display = 'flex');
  document.querySelectorAll('.tag-button').forEach(btn => btn.classList.remove('active'));
  const allBtn = document.querySelector('.tag-button[data-genre=""]');
  if (allBtn) allBtn.classList.add('active');
  renderCards(songs);
}

function filterBySearch(songs, query, selectedGenre, selectedArtists = [], selectedWorks = []) {
  return songs.filter(song => {
    const matchesQuery = !query || 
      song['タイトル'].toLowerCase().includes(query) || 
      song['アーティスト'].toLowerCase().includes(query) ||
      song['作品名'].toLowerCase().includes(query);
    const matchesGenre = !selectedGenre || 
      (song['ジャンル'] && song['ジャンル'].split('、').some(g => g.trim() === selectedGenre));
    const matchesArtist = selectedArtists.length === 0 || 
      (song['アーティスト'] && song['アーティスト'].split('、').some(a => selectedArtists.includes(a.trim())));
    const matchesWork = selectedWorks.length === 0 || 
      (song['作品名'] && song['作品名'].split('、').some(w => selectedWorks.includes(w.trim())));
    return matchesQuery && matchesGenre && matchesArtist && matchesWork;
  });
}

function renderCards(songs, selectedGenre = '', searchQuery = '', selectedArtists = [], selectedWorks = []) {
  const filteredSongs = filterBySearch(songs, searchQuery, selectedGenre, selectedArtists, selectedWorks);
  const list = document.querySelector('#songsList');
  list.innerHTML = '';
  // メッセージ用要素があれば削除
  const oldMsg = document.getElementById('no-result-message-outer');
  if (oldMsg) oldMsg.remove();
  if (filteredSongs.length === 0) {
    const container = document.querySelector('.container');
    const msgDiv = document.createElement('div');
    msgDiv.id = 'no-result-message-outer';
    msgDiv.className = 'no-result-message-outer';
    msgDiv.innerHTML = '<div class="no-result-message-inner">該当する曲がありません。<br>フィルター条件を変更してください。</div>';
    container.appendChild(msgDiv);
    return;
  }

  filteredSongs.forEach(song => {
    const work = song['作品名'] || '';
    const genre = song['ジャンル'] || '';
    const artist = song['アーティスト'] || '';
    const card = document.createElement('div');
    card.className = 'song-card';
    const titleHtml = `<div class="song-title">${truncateText(song['タイトル'] || '', 18)}</div>`;
    const artistHtml = artist ? `<div class="song-artist">${truncateText(artist, 18)}</div>` : '';
    const details = [];
    if (work) details.push(`<span class="song-category">${truncateText(work, 16)}</span>`);
    if (genre) details.push(`<span class="song-category">${truncateText(genre, 12)}</span>`);
    const detailsHtml = details.length ? `<div class="song-details">${details.join('')}</div>` : '';
    card.innerHTML = `
      <div class="song-icon">♪</div>
      <div class="song-content">
        ${titleHtml}
        ${artistHtml}
        ${detailsHtml}
      </div>
    `;
    list.appendChild(card);
  });
}

function filterSongs(songs) {
  const checkedArtists = getCheckedValues('artist');
  const checkedWorks = getCheckedValues('work');
  const checkedGenres = getCheckedValues('genre');
  return songs.filter(song => {
    // アーティスト
    const songArtists = song['アーティスト'] ? song['アーティスト'].split('、').map(s => s.trim()) : [];
    const songWorks = song['作品名'] ? song['作品名'].split('、').map(s => s.trim()) : [];
    const songGenres = song['ジャンル'] ? song['ジャンル'].split('、').map(s => s.trim()) : [];
    const artistMatch = checkedArtists.length === 0 || songArtists.some(a => checkedArtists.includes(a));
    const workMatch = checkedWorks.length === 0 || songWorks.some(w => checkedWorks.includes(w));
    const genreMatch = checkedGenres.length === 0 || songGenres.some(g => checkedGenres.includes(g));
    return artistMatch && workMatch && genreMatch;
  });
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

fetch('songs.csv')
  .then(res => res.text())
  .then(text => {
    const songs = parseCSV(text);
    renderDropdownUI(songs);
    renderFilterUI(songs);
    renderCards(songs);
    document.querySelector('#searchBox').addEventListener('input', (e) => {
      renderCards(songs, getSelectedGenre(), e.target.value.toLowerCase(), getSelectedArtists(), getSelectedWorks());
    });
    document.querySelector('#clearFiltersBtn').addEventListener('click', () => {
      clearAllFilters(songs);
    });
  });

// 背景画像のタイルをcanvasで描画し、境目を隠すために偶数枚目を反転
const canvas = document.createElement('canvas');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1';
document.body.insertBefore(canvas, document.body.firstChild);

const ctx = canvas.getContext('2d');
const img = new Image();
img.src = 'img/nekocup.png';

function drawBackground() {
  const tileWidth = img.width;
  const tileHeight = img.height;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  for (let j = 0, y = 0; y < canvas.height; y += tileHeight, j++) {
    for (let x = 0; x < canvas.width; x += tileWidth) {
      ctx.save();
      if (j % 2 === 1) {
        ctx.scale(1, -1);
        ctx.translate(x, -y - tileHeight);
      } else {
        ctx.translate(x, y);
      }
      ctx.drawImage(img, 0, 0, tileWidth, tileHeight);
      ctx.restore();
    }
  }
}

img.onload = drawBackground;
window.addEventListener('resize', drawBackground);

// ドロップダウンの背景オーバーレイ
const dropdownBackdrop = document.createElement('div');
dropdownBackdrop.className = 'dropdown-backdrop';
dropdownBackdrop.addEventListener('click', () => {
  closeDropdowns();
});
document.body.appendChild(dropdownBackdrop);

// closeDropdowns をグローバルに定義
function closeDropdowns() {
  const artistList = document.querySelector('#artistList');
  const workList = document.querySelector('#workList');
  artistList.classList.remove('open', 'fullscreen');
  workList.classList.remove('open', 'fullscreen');
  // 閉じるボタンを削除
  const closeBtns = document.querySelectorAll('.dropdown-close-btn');
  closeBtns.forEach(btn => btn.remove());
  // 背景を隠す
  dropdownBackdrop.style.display = 'none';
}
