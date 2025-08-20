class Paginator {
  constructor(linesPerBox, boxes = 2) {
    this.linesPerBox = linesPerBox;
    this.boxes = boxes;
    this.pageStarts = [0];
    this.page = 0;
  }
  ensureCurrentPageIndex(wrappedLength) {
    if (!Number.isInteger(this.pageStarts[this.page]))
      this.pageStarts[this.page] = wrappedLength;
  }
  maybeAddPage(curStart, wrappedLength) {
    const capPerPage = this.linesPerBox * this.boxes;
    const linesFromCur = wrappedLength - curStart;
    if (this.page === this.pageStarts.length - 1 && linesFromCur > capPerPage) {
      const overflowStart = curStart + capPerPage;
      if (this.pageStarts[this.pageStarts.length - 1] !== overflowStart) {
        this.pageStarts.push(overflowStart);
      }
      this.page = this.pageStarts.length - 1;
    }
  }
  currentSlice(wrapped) {
    const start = this.pageStarts[this.page];
    const next =
      this.page + 1 < this.pageStarts.length
        ? this.pageStarts[this.page + 1]
        : wrapped.length;
    return wrapped.slice(start, next);
  }
  hasPrev() {
    return this.page > 0;
  }
  hasNext() {
    return this.page + 1 < this.pageStarts.length;
  }
  goPrev() {
    if (this.hasPrev()) this.page--;
  }
  goNext() {
    if (this.hasNext()) this.page++;
  }
}
window.Paginator = Paginator;
