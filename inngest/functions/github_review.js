import { octokit } from "../../lib/github.js";
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
        const { owner, repo, pull_number } = event.data;
        const pullRequestInfo = await step.run("fetch-pullrequest-inforation", async () => {
            try {
                const pullRequestObject = await octokit.pulls.get({ owner, repo, pull_number });
                console.log("pullRequestObject",pullRequestObject)
                return {
                    id: pullRequestObject.data.id,
                    title: pullRequestObject.data.title,
                    state: pullRequestObject.data.state,
                    number: pullRequestObject.data.number,
                    comments: pullRequestObject.data.comments,
                    url: pullRequestObject.data.url,
                    diffUrl: pullRequestObject.data.diff_url,
                    changes: pullRequestObject.data.changes,
                    commits: pullRequestObject.data.commits,
                }
            } catch (error) {
                return null
            }
        });
        if (!pullRequestInfo) return { message: "Pull request not found", skip: true }
        if (pullRequestInfo.state !== "open") return { message: "Pull request is not open, Skipping the review", skip: true, completed: false }
        const changes = await step.run("fetch-changes", async ()=>{
            const changesResult = await octokit.paginate(octokit.pulls.listFiles, {
                owner, repo, pull_number, per_page : 100
            })
            return changesResult.map(change =>({
                filename : change.filename,
                status : change.status,
                changes : change.changes,
                patch: change.patch,
                additions : change.additions,
                delitions : change.deletions,
                previous_filename : change.previous_filename
            }))
        })

        if (changes.length == 0) return {message:"There is no changes in this PR ", skip:true}

        await step.run("analyse-using-ai", async ()=>{
            
        })

    })