function concatRegExp(exprArr, mainFlag) {
  const newExpr = exprArr.reduce(
    (sumExpr, currentExpr) => sumExpr.source + "|" + currentExpr.source
  );
  return new RegExp(newExpr, mainFlag);
}

class Task {
  constructor(data) {
    this.rawData = data;
    this.question = [];
    this.headings = [];
    this.answers = [];

    this.markerIndices = [];
    // (?<!\p{sc=Cyrillic}) is a negative lookbehind that ensures there isn't a Cyrillic character before our match
    // \p{sc=Cyrillic} matches exactly one Cyrillic character
    // \) matches the closing bracket
    this.answersMarkerLists = [
      /(?<!\p{sc=Cyrillic})\p{sc=Cyrillic}\)/giu,
      /\d\)/gi,
    ];
    this.redunantText = ["Пропущенные элементы:"];
  }

  // basically there're 3 options for text after question: 1) named answers columns, 2) unnamed answers columns, 3) just text that specify question.

  deleteRedundantText() {
    this.rawData = this.rawData.filter(
      (string) => !this.redunantText.includes(string)
    );
    return this;
  }

  addListHeaders() {
    //find headings in task text
    this.headings = this.rawData.filter(
      (string) =>
        // expected smth like "ПРОЦЕССЫ" "ФАКТЫ"
        string.toUpperCase() === string &&
        string.length > 2 &&
        isNaN(Number(string))
    );

    //delete headings in rawData
    if (this.headings.length) {
      this.rawData = this.rawData.filter(
        (string) => !this.headings.includes(string)
      );
    }
    return this;
  }

  findMarkerIndices() {
    const markerIndices = [];

    const markersReg = concatRegExp(this.answersMarkerLists, "gui");

    for (let i = 0; i < this.rawData.length - 1; i++) {
      let string = this.rawData[i];
      if (string.search(markersReg) !== -1) {
        markerIndices.push(i);
      }
    }
    markerIndices.push(this.rawData.length); // last index of the array + 1 - it's needed to slice answer strings from the original array
    return markerIndices;
  }

  getAnswersLists(indices) {
    const rawAnswersLists = [];
    for (let i = 0; i < indices.length - 1; i++) {
      let answer = this.rawData.slice(indices[i], indices[i + 1]).join(" ");
      rawAnswersLists.push(answer);
    }
    return rawAnswersLists;
  }

  writeListAnswers() {
    this.markerIndices = this.findMarkerIndices();
    const rawAnswersLists = this.getAnswersLists(this.markerIndices);

    this.answersMarkerLists.forEach((marker) => {
      const answerList = rawAnswersLists.filter(
        (string) => string.search(marker) !== -1
      );
      if (answerList.length) {
        this.answers.push(answerList);
      }
    });
    return this;
  }

  writeQuestionInfo() {
    if (this.markerIndices.length) {
      this.question = this.rawData.slice(0, this.markerIndices[0]);
    }

    return this;
  }

  assembleTask() {
    this.headings.forEach((heading, index) => {
      this.answers[index].unshift(heading);
    });

    const answersLists = this.answers
      .map((string) => string.join("\n"))
      .join("\n\n");
    const question = this.question.join("\n");
    const task = question + "\n\n" + answersLists;

    return task;
  }
}

const formTask = (task) => {
  const parsedTask = new Task(task);
  return parsedTask
    .deleteRedundantText()
    .addListHeaders()
    .writeListAnswers()
    .writeQuestionInfo()
    .assembleTask();
};

export { formTask };
