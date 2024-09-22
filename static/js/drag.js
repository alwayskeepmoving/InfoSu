
const elements = document.querySelectorAll('.section');
let draggedElement = null;

elements.forEach(ele => {
    ele.addEventListener('dragstart', dragStart);
    ele.addEventListener('dragend', dragEnd);
    ele.addEventListener('dragover', dragOver);
    ele.addEventListener('drop', drop);
});

function dragStart(event) {
    draggedElement = this;
    this.classList.add("moving");
    event.dataTransfer.effectAllowed = 'move';
}

function dragEnd() {
    this.classList.remove("moving");
    draggedElement = null;
}

function dragOver(event) {
    event.preventDefault(); // 允许放置
}

function drop(event) {
    event.preventDefault();
    if (draggedElement && draggedElement !== this) {
        const draggedIndex = Array.from(elements).indexOf(draggedElement);
        const targetIndex = Array.from(elements).indexOf(this);

        if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedElement, this);
        }
    }
}