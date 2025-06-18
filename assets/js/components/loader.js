class Loader {
    constructor() {
        this.loaderElement = null;
        this.isVisible = false;
    }

    create(message = 'Carregando...') {
        if (this.loaderElement) {
            return;
        }

        this.loaderElement = document.createElement('div');
        this.loaderElement.classList.add('loader-overlay');
        this.loaderElement.setAttribute('role', 'alert');
        this.loaderElement.setAttribute('aria-live', 'assertive');

        this.loaderElement.innerHTML = `
            <div class="loader">
                <div class="loader-spinner" aria-hidden="true"></div>
                <span class="loader-text">${message}</span>
            </div>
        `;
    }

    show(message) {
        if (!this.loaderElement) {
            this.create(message);
        } else if (message) {
            this.loaderElement.querySelector('.loader-text').textContent = message;
        }

        if (!this.isVisible) {
            document.body.appendChild(this.loaderElement);
            this.isVisible = true;
        }
    }

    hide() {
        if (this.loaderElement && this.isVisible) {
            document.body.removeChild(this.loaderElement);
            this.isVisible = false;
        }
    }

    updateMessage(message) {
        if (this.loaderElement && this.isVisible) {
            this.loaderElement.querySelector('.loader-text').textContent = message;
        }
    }
}

export default Loader;
