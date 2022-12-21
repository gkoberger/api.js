// This was the best way I could think to surface this stuff to the api module on throw
// and I'm sure there is more functionality we will want to add here
export default class error {
  constructor(errorType, data) {
    this.errorType = errorType;
    this.data = data;
  }
}
