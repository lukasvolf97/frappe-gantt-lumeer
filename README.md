<div align="center">
    <img src="https://github.com/frappe/design/blob/master/logos/gantt-logo.svg" height="128">
    <h2>Frappe Gantt</h2>
    <p align="center">
        <p>A simple, interactive, modern gantt chart library for the web</p>
        <a href="https://frappe.github.io/gantt">
            <b>View the demo »</b>
        </a>
    </p>
</div>

<p align="center">
    <a href="https://frappe.github.io/gantt">
        <img src="https://cloud.githubusercontent.com/assets/9355208/21537921/4a38b194-cdbd-11e6-8110-e0da19678a6d.png">
    </a>
</p>

### Install
```
npm install frappe-gantt
```

### Usage
Include it in your HTML:
```
<script src="frappe-gantt.min.js"></script>
<link rel="stylesheet" href="frappe-gantt.css">
```

And start hacking:
```js
var tasks = [
  {
    id: 'Task 1',
    name: 'Redesign website',
    start: '2019-12-28',
    end: '2019-12-31',
    progress: 20,
    dependencies: 'Task 2, Task 3',
    custom_class: 'bar-milestone', // optional
    swimlane: 'Steps',
    sub_swimlane: '1. Step',
    start_drag: false, //cannot change start date
    end_drag: true, //cannot change end date
	to_show_in_popup: "new-progress:My Custom Progress Text:progress" //custom class:custom text:name of task property to show
  },
  {
    id: 'Task 2',
    name: 'Write new content',
	start: '2019-10-03',
	end: '2019-10-06',
    progress: 20,
    dependencies: 'Task 3',
    editable: false, //cannot change any value (interactively)
    swimlane: 'Steps',
    sub_swimlane: '2. Step',
  },
  {
    id: 'Task 3',
    name: 'Deploy',
	start: '2019-10-04',
	end: '2019-10-06',
    progress: 5,
    dependencies: 'Task 4',
    primary_color: 'green',
    text_color: '#3399ff',
    swimlane: 'Final Stage',
  },
  {
    id: 'Task 4',
    name: 'Go Live',
	start: '2019-10-11',
	end: '2019-10-11',
    progress: 0,
    secondary_color: 'rgb(255, 51, 204)',
  },
  {
    name: 'Minimum',
	start: '2019-10-12',
	end: '2019-10-12',
  },
  ...
]
var gantt = new Gantt("#gantt", tasks);
```

You can also pass various options to the Gantt constructor:
```js
var gantt = new Gantt("#gantt", tasks, {
    header_height: 50,
    column_width: 30,
    step: 24,
    view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
    bar_height: 20,
    bar_corner_radius: 3,
    arrow_curve: 5,
    padding: 18,
    view_mode: 'Day',   
    date_format: 'YYYY-MM-DD',
    custom_popup_html: null
});
```

If you want to contribute:

1. Clone this repo.
2. `cd` into project directory
3. `yarn`
4. `yarn run dev`

License: MIT

------------------
Project forked from [frappe](https://github.com/frappe) and maintained by [Lumeer](https://github.com/Lumeer)
