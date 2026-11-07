import { inngest } from "../client.js"

export const githubPullRequestReview = inngest.createFunction(
    {
        id: "github-pr-review-1",
        triggers: [{
            event: "github/pullrequest.review"
        }]
    },
    async ({ event, step }) => {
        // Fetch the pull request info
        await step.run("fetch-pullrequest-inforation", async () => {
            const {owner, repo, pull_number} = event.data
        })
    })