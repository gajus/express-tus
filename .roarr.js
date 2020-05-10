module.exports = {
  filterFunction: (message) => {
    if (
      message.message.includes('client connection is closed and removed from the client pool') ||
      message.message.includes('created a new client connection') ||
      message.message.includes('client is checked out from the pool')
    ) {
      return false;
    }

    return true;
  },
};
