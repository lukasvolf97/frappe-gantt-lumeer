import { $, createSVG } from './svg_utils';

export default class Arrow {
    constructor(gantt, from_task, to_task) {
        this.gantt = gantt;
        this.from_task = from_task;
        this.to_task = to_task;

        this.calculate_path();
        this.draw();
    }

    calculate_path() {

        if (this.endpoint === undefined) {
            this.endpoint = (this.from_task.$bar.getX() <= this.to_task.$bar.getX()) ? this.from_task.$endpoint_end :
                this.from_task.$endpoint_start;
            this.endpoint.style.opacity = 1;
            this.endpoint.is_used = true;
        }
        const start_x =
            this.endpoint.getAttribute('cx');

        const start_y =
            this.endpoint.getAttribute('cy');

        const end_x = this.to_task.$bar.getX() - this.gantt.options.padding / 2;
        const end_y =
            this.gantt.options.header_height +
            this.gantt.options.bar_height / 2 +
            (this.gantt.options.padding + this.gantt.options.bar_height) *
            this.to_task.task._index +
            this.gantt.options.padding;

        const from_is_below_to =
            this.from_task.task._index >= this.to_task.task._index;
        const curve = this.gantt.options.arrow_curve;
        const clockwise = from_is_below_to ? 1 : 0;
        const curve_y = from_is_below_to ? -curve : curve;
        const offset = from_is_below_to
            ? end_y + this.gantt.options.arrow_curve
            : end_y - this.gantt.options.arrow_curve;


        const down_1 = this.gantt.options.padding - curve;
        const down_2 =
            this.to_task.$bar.getY() +
            this.to_task.$bar.getHeight() / 2 -
            curve_y;
        const left = this.to_task.$bar.getX() - this.gantt.options.padding;

        if (this.endpoint.getAttribute('class').includes('start')) {
            let h_attr = (this.to_task.$bar.getX() > this.from_task.$bar.getX()) ? `h ${-curve * 2}` : `H ${left}`;
            this.path = `
            M ${start_x} ${start_y}
            ${h_attr}
            a ${curve} ${curve} 0 0 ${clockwise} -${curve} ${curve_y}
            V ${down_2}
            a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
            L ${end_x} ${end_y}
            m -5 -5
            l 5 5
            l -5 5`;
        } else {
            if (this.to_task.$bar.getX() <= this.from_task.$bar.getEndX()) {
                this.path = `
                M ${start_x} ${start_y}
                v ${down_1}
                a ${curve} ${curve} 0 0 1 -${curve} ${curve}
                H ${left}
                a ${curve} ${curve} 0 0 ${clockwise} -${curve} ${curve_y}
                V ${down_2}
                a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
                L ${end_x} ${end_y}
                m -5 -5
                l 5 5
                l -5 5`;
            } else {
                if (this.to_task.$bar.getY() !== this.from_task.$bar.getY()) {
                    this.path = `
                    M ${start_x} ${start_y}
                    V ${down_2}
                    a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
                    L ${end_x} ${end_y}
                    m -5 -5
                    l 5 5
                    l -5 5`;
                } else {
                    this.path = `
                    M ${start_x} ${start_y}
                    L ${end_x} ${end_y}
                    m -5 -5
                    l 5 5
                    l -5 5`;
                }
            }
        }
    }

    setup_click_event() {
        $.on(this.element, 'click', e => {

            if (e.type === 'click') {
                this.gantt.trigger_event('dependency_deleted', [this.element]);
            }

            this.element.parentNode.removeChild(this.element);
            if (this.to_task.task.dependencies.length === 0) {
                this.element.style.opacity = null;
            }
            this.to_task.task.dependencies = this.to_task.task.dependencies.filter(d => d !== this.from_task.task.id);
            this.gantt.arrows = this.gantt.arrows.filter(a => a !== this);
            this.from_task.arrows = this.from_task.arrows.filter(a => a !== this);
            let is_used = false;
            this.from_task.arrows.forEach(a => {
                if (a.endpoint === this.endpoint)
                    is_used = true;
            });
            this.endpoint.is_used = is_used
            this.endpoint.style.opacity = is_used ? 1 : null;
            this.to_task.arrows = this.to_task.arrows.filter(a => a !== this);
        });
    }

    draw() {
        this.element = createSVG('path', {
            d: this.path,
            'data-from': this.from_task.task.id,
            'data-to': this.to_task.task.id
        });
        this.setup_click_event()
    }

    update() {
        this.calculate_path();
        this.element.setAttribute('d', this.path);
    }
}
