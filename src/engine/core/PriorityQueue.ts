export class PriorityQueue<T> {
    private _heap: { priority: number; item: T }[] = [];

    constructor(initialItems?: { priority: number; item: T }[]) {
        if (initialItems) {
            this._heap = [...initialItems];
            this._heapify();
        }
    }

    get length(): number {
        return this._heap.length;
    }

    push(item: T, priority: number): void {
        this._heap.push({ priority, item });
        this._bubbleUp(this._heap.length - 1);
    }

    pop(): T | undefined {
        if (this._heap.length === 0) return undefined;

        const root = this._heap[0];
        const last = this._heap.pop();

        if (this._heap.length > 0 && last) {
            this._heap[0] = last;
            this._bubbleDown(0);
        }

        return root?.item;
    }

    peek(): T | undefined {
        return this._heap[0]?.item;
    }

    private _heapify(): void {
        for (let i = Math.floor(this._heap.length / 2); i >= 0; i--) {
            this._bubbleDown(i);
        }
    }

    private _bubbleUp(index: number): void {
        const element = this._heap[index];
        while (index > 0) {
            const parentIdx = Math.floor((index - 1) / 2);
            const parent = this._heap[parentIdx];

            if (element.priority >= parent.priority) break;

            this._heap[parentIdx] = element;
            this._heap[index] = parent;
            index = parentIdx;
        }
    }

    private _bubbleDown(index: number): void {
        const length = this._heap.length;
        const element = this._heap[index];

        while (true) {
            let leftChildIdx = 2 * index + 1;
            let rightChildIdx = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIdx < length) {
                leftChild = this._heap[leftChildIdx];
                if (leftChild.priority < element.priority) {
                    swap = leftChildIdx;
                }
            }

            if (rightChildIdx < length) {
                rightChild = this._heap[rightChildIdx];
                if (
                    (swap === null && rightChild.priority < element.priority) ||
                    (swap !== null && rightChild.priority < leftChild!.priority) // ! is safe because swap!=null implies leftChild exists
                ) {
                    swap = rightChildIdx;
                }
            }

            if (swap === null) break;

            this._heap[index] = this._heap[swap];
            this._heap[swap] = element;
            index = swap;
        }
    }
}
