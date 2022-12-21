## Things I've Started

### One endpoint per file

I think this led to a cleaner API since there is less stuff being passed around. We can just export functions in the file that are used by the api module. There is one default export which is the executed code when the endpoint is called, and utility functions that configure the api module. This also leaves us room to add easy ways to do mocking, testing, mapping version, etc in the future. 

Currently (at least somewhat) supported:
* errors
* auth
* documentation

### Typescript

This was mostly an excersize in learning typescript myself, and I don't think we should use anything I did here. Right now the ts bundling happens in the built API, which is messy and doesn't give us any of the benefits. I think what we will need to do here is parse the ts in the api module itself so we can use the types when building the oas file, and at this point output the compiled js that we actually run.

### Error Handling

Added an `errors` function that should return an array of all the errors this endpoint can return. Also added an error utility function that lets you easily throw one of these errors (including passing custom data to the error message).

```js
import error from 'api.js/error'

export default async function show({ user, $id }) {
  if (!$id.startsWith('car_')) {
    throw new error('INCORRECT_ID', { $id });
  }
  return { id: $id };
}

// Returns an array of all possible errors this endpoint can return
export function errors() {
 return (
   [{
     type: "MISSING_ID",
     message: "You need to pass an ID",
   },
   {
     type: "INCORRECT_ID",
     message: "Invalid ID provided. ID must begin with `car_` and an id of `$id` was provided.",
   }]
 );
}
```

Things to do here still:
- Should add all the errors to the OAS file
- How do we let them define status codes? Do we at all? 
- There are probably some errors we can be smart about (404s come to mind). In my example MISSING_ID isn't really possible
- Probably have opinions on the response format

## Notes on other functionality

Haven't really thought too much about stuff here, just keeping notes on stuff we've talked about.

### Versioning

* Not allowing breaking changes initially (could potentially enforce this in an interesting way)
* `api lock` type command that makes sure changes to the API are non-breaking. 
* In the future we could have a way to map from one version to another, so even with a breaking change it is easy to maintain

### Testing

Unsurprisingly, I haven't thought about testing at all yet.

### Data Model

* How does this work with a database? 
* Pagination? 
* Standardized reponses?

### Metrics/Webhooks/ReadMe

This should work basically out of the box and have a super easy command to import the API to ReadMe (Greg already started this). I think metrics should be pretty easy here (since we are routing all the api calls) but I'm not sure how the webhook piece will work yet (maybe we can do something with the auth.js file?).
