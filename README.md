# Life Calendar

A distraction-free web app that visualizes your life in weeks. Each square represents one week of your expected lifespan based on life expectancy data for your country and sex.

**Live Demo:** [https://calebmkeller.com/life-calendar](https://calebmkeller.com/life-calendar)

![Life Calendar Screenshot](screenshot.png)

## Features

- **Full-screen calendar** - Each square is one week of your life
- **Life expectancy data** - Uses real data from 100+ countries (source: Worldometers)
- **Custom highlights** - Mark significant life events with colored date ranges
- **10 themes** - Catpuccin (Mocha, Latte, Frappe, Macchiato), Gruvbox, Solarized Dark/Light, Dracula, Nord, Tokyo Night
- **Shareable URLs** - Embed settings in a URL to share your calendar
- **Mobile support** - Responsive grid with tap-to-view tooltips
- **No backend** - All data stored locally in your browser

## Usage

1. On first load, enter your sex, date of birth, and country of residence
2. The calendar fills the screen with your life in weeks
3. Hover (or tap on mobile) any square to see the date
4. Use the menu in the bottom-right corner to:
   - Open settings (gear icon)
   - View life stats and expected death date (info icon)
   - Copy a shareable URL (share icon)

## Local Development

No build step required. Just serve the files:

```bash
# Using Python
python -m http.server 8000

# Using Node
npx serve
```

Then open http://localhost:8000

## License

MIT
