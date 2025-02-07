const restrictedTags = ["script", "input"];

// в SELECTN submit-outblock содержит полезнкю нагрузку, поэтому нужно найти другой класс. В ACCORD я нашел answer-table, в SELECTN это distractors-table
// исходя из результатов проверки всезде, кроме SELECYN используется answer-table, так что можно изменить на него submit-outblock и молиться, что ничего не сломается
// const restrictedCLasses = ["submit-outblock"];
const restrictedCLasses = ["hint", "answer-table"];
const restrictedNames = ["chkcodeform"];

const validTags = ["p"];

//class for more convinient moving in DOM
class domNode {
  constructor(node, parsedText, ancestor) {
    this.node = node;
    this.parsedText = [];
    this.parsedText = parsedText;
    this.ancestor = ancestor;
  }

  goUp() {
    return new domNode(this.node.parentElement, this.parsedText, this.ancestor);
  }

  goDown() {
    return new domNode(
      this.node.firstElementChild,
      this.parsedText,
      this.ancestor
    );
  }

  goAside() {
    return new domNode(
      this.node.nextElementSibling,
      this.parsedText,
      this.ancestor
    );
  }

  checkSiblings() {
    return this.node.nextElementSibling ? true : false;
  }
  //will go up and aside till doesn't catch valid tag
  validate() {
    //validation process - skip invalid tags

    if (restrictedTags.includes(this.node.tagName.toLowerCase())) {
      return this.findNextNode().validate();
    }

    if (restrictedNames.includes(this.node.name)) {
      return this.findNextNode().validate();
    }

    if (restrictedCLasses.includes(this.node.className)) {
      return this.findNextNode().validate();
    }
    return this;
  }

  // 'cause fipi dev team smoke some tough shit tag p has empty span inside (just because) and consequently no text date pushes to arr.
  // That's why I had to create function that immediately pushes text to arr if sees p tag. Hope I won't regret about it...
  checkValidTags() {
    if (validTags.includes(this.node.tagName.toLowerCase())) {
      this.checkText();
      return this.findNextNode().checkValidTags(); // there's reqcursion 'cause we should check all valid tags until we found tag that needed to be parsed
    }
    return this;
  }

  checkChildren() {
    return this.node.children.length ? true : false;
  }

  getFirstChild() {
    return this.goDown();
  }

  findNextNode() {
    //
    if (this.node === this.ancestor) {
      return this;
    }
    return this.checkSiblings() ? this.goAside() : this.goUp().findNextNode();
  }

  checkText() {
    if (this.node.textContent.trim().length) {
      const formedText = this.node.textContent.replace(/\s+/g, " ").trim(); //replaces all kinds of space by oridinary space
      this.parsedText.push(formedText);
    }
    return this;
  }
}

const parsingDom = (newParent) => {
  // const parent =
  //   newParent instanceof domNode
  //     ? newParent
  //     : (new Array(text), new domNode(newParent, text, newParent));

  let parent;
  if (newParent instanceof domNode) {
    parent = newParent;
  } else {
    const text = [];
    parent = new domNode(newParent, text, newParent);
  }
  //validation
  const validParent = parent.validate().checkValidTags();

  //finish condition
  if (
    validParent.node === validParent.ancestor &&
    validParent.parsedText.length !== 0
  ) {
    return;
  }
  //DOM moving and text parsing

  const child = validParent.checkChildren()
    ? validParent.getFirstChild()
    : validParent.checkText().findNextNode();

  parsingDom(child);
  //return task text
  return validParent.parsedText;
};

export { parsingDom };
