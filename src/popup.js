export default class Popup {
    constructor(parent, custom_html) {
        this.parent = parent;
        this.custom_html = custom_html;
        this.make();
    }

    make() {
        this.parent.innerHTML = `
            <div class="title"></div>
            <div class="subtitle"></div>
            <div class="pointer"></div>
        `;

        this.hide();

        this.title = this.parent.querySelector('.title');
        this.subtitle = this.parent.querySelector('.subtitle');
        this.pointer = this.parent.querySelector('.pointer');
    }

    show(options) {
        if (!options.target_element) {
            throw new Error('target_element is required to show popup');
        }
        if (!options.position) {
            options.position = 'left';
        }
        this.options = options;
        const target_element = options.target_element;

        if (this.custom_html) {
            let html = this.custom_html(options.task);
            html += '<div class="pointer"></div>';
            this.parent.innerHTML = html;
            this.pointer = this.parent.querySelector('.pointer');
        } else {
            // set data
            if (typeof options.task.to_show_in_popup === 'string') {
                this.parent.innerHTML = '<div class="title">'+ options.title +'</div>';
                let to_show = options.task.to_show_in_popup.split(',');
                to_show.forEach((item_with_class) => {
                    let class_item = item_with_class.split(':');
                    this.parent.innerHTML += `
                    <div class="` + (class_item[0].length == 0 ? 'subtitle' : class_item[0]) + '">'
                        + (class_item[1].length == 0 ? '' : class_item[1] + ': ') + options.task[class_item[2]] +
                        '</div>';
                });
                this.parent.innerHTML += '<div class="pointer"></div>';
                this.pointer = this.parent.querySelector('.pointer');
            } else {
                this.make();
                this.title.innerHTML = options.title;
                this.subtitle.innerHTML = options.subtitle;
                this.parent.style.width = this.parent.clientWidth + 'px';
            }
        }

        // set position
        let position_meta;
        if (target_element instanceof HTMLElement) {
            position_meta = target_element.getBoundingClientRect();
        } else if (target_element instanceof SVGElement) {
            position_meta = options.target_element.getBBox();
        }

        if (options.position === 'left') {
            this.parent.style.left =
                position_meta.x + (position_meta.width + 10) + 'px';
            this.parent.style.top = position_meta.y + 'px';

            this.pointer.style.transform = 'rotateZ(90deg)';
            this.pointer.style.left = '-7px';
            this.pointer.style.top = '2px';
        }

        // show
        this.parent.style.visibility = 'visible';
    }

    hide() {
        this.parent.style.visibility = 'hidden';
    }
}
