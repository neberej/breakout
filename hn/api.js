
const CONFIG = {
  url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
  link: 'https://news.ycombinator.com/item?id=',
  itemUrl: id => `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
  limit: 14,
  display: 12,
  brickTypes: ['show hn', 'ask hn', 'story', 'launch hn']
};

const getCategory = (title = '') => {
  const lower = title.toLowerCase();
  if (lower.startsWith('show')) return 'show hn';
  if (lower.startsWith('ask')) return 'ask hn';
  if (lower.startsWith('launch')) return 'launch hn';
  return 'story';
};

const FALLBACK_DATA = [
  { title: 'Sample Ask', type: 'ask hn', desc: 'some desc', vote: 20, storyType: 'ask hn', url: '#' },
  { title: 'Sample Show', type: 'show hn', desc: 'some desc2', vote: 10, storyType: 'show hn', url: '#' }
];

export const getData = async () => {
  const { url, link, itemUrl, limit, display, brickTypes } = CONFIG;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch top stories');

    const storyIds = await res.json();
    const topStories = storyIds.slice(0, limit);

    const storyData = await Promise.all(
      topStories.map(id => fetch(itemUrl(id)).then(res => res.json()))
    );

    const validStories = storyData
      .filter(s => s?.title && s?.score != null && s?.descendants != null)
      .slice(0, display);

    if (!validStories.length) throw new Error('No valid stories');

    return validStories.map((story, index) => ({
      title: story.title,
      type: brickTypes[index % brickTypes.length],
      desc: `${story.descendants}`,
      vote: story.score,
      storyType: getCategory(story.title),
      url: `${link}${story.id}`
    }));
  } catch {
    return FALLBACK_DATA;
  }
};
