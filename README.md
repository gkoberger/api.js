Hey there! I'm working on a new API framework. There's a lot of ways to build APIs out there, and I want one that introduces some new ideas into the mix.

Think of it as Next.js, but for APIs... a framework built by people who have seen enough to have some strong opinions on how to drag progress forward.

This code is a playground currently. While the goal is to make it production ready, we're still in the prototyping phase.

I've love feedback, ideas and PRs!

# Goals of this project

 * Create a standardized framework that works for a majority of API usecases.
 * Play with some new concepts to make APIs more valuable
 * Tighten the loop between creating and consuming APIs
 * Allow developers to ship updates quickly, while not breaking users

# Core Principles
 * *Versioning* What if there was only one version ever, and backwards compatibility was solved in other ways?
 * *Robust* The framework should have leway, and normalize language-based oddities behind the scenes
 * *OAS generation* Nobody should ever have to write an OAS files themselves. The code should be the source of truth.
 * *Errors* How can we make sure all errors are consistent and keep moving the user forward?
 * *SDK Generation* Can the SDK be more tightly connected to the API?
 * *Integrated with the docs* How can we make more dynamic docs, given what it could know about the API?

# How to set it up

You'll want to set up an alias in .aliasrc, like this:

    $ alias api='node /path/to/api.js/index.js'

Then you can type:

    $ api init

To add an endpoint, type:

    $ api add endpoint

And then to run it:

    $ api dev

