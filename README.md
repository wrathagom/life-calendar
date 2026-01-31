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

## Examples

Pre-made life calendars for notable people. [View all examples](examples/).

### Musicians

| Name | Link |
|------|------|
| Adele | [View](https://calebmkeller.com/life-calendar?example=adele) |
| Beyoncé | [View](https://calebmkeller.com/life-calendar?example=beyonce) |
| Justin Bieber | [View](https://calebmkeller.com/life-calendar?example=justin-bieber) |
| Madonna | [View](https://calebmkeller.com/life-calendar?example=madonna) |
| Nicki Minaj | [View](https://calebmkeller.com/life-calendar?example=nicki-minaj) |
| SZA | [View](https://calebmkeller.com/life-calendar?example=sza) |
| Taylor Swift | [View](https://calebmkeller.com/life-calendar?example=taylor-swift) |
| The Weeknd | [View](https://calebmkeller.com/life-calendar?example=the-weeknd) |

### Adding Examples

Examples are JSON files in the `examples/` directory. To add one:

```json
{
  "name": "Person Name",
  "sex": "female",
  "dob": "1990-01-15",
  "country": "United States",
  "theme": "default",
  "periods": [
    { "label": "Era Name", "startDate": "2010-01-01", "endDate": "2015-12-31", "color": "#ef4444" }
  ],
  "moments": [
    { "label": "Event", "date": "2012-06-15", "color": "#fbbf24", "shape": "star" }
  ]
}
```

Available shapes: `star`, `heart`, `diamond`, `circle`

## Local Development

No build step required. Just serve the files:

```bash
# Using Python
python -m http.server 8000

# Using Node
npx serve
```

Then open http://localhost:8000

No dependencies are required; `node_modules` is not needed for local use.

## License

MIT
