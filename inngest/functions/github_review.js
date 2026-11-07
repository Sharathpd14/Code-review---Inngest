import { githubPullRequestReviewAgent } from "../../agent/github-pr-review-agent.js";
import { octokit } from "../../lib/github.js";
import { inngest } from "../client.js"
import { run } from '@openai/agents';

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
                    head: {
                        ref: pullRequestObject.data.head.ref,
                        sha: pullRequestObject.data.head.sha,
                    },
                }
            } catch (error) {
                return null
            }
        });
        if (!pullRequestInfo) return { message: "Pull request not found", skip: true }
        if (pullRequestInfo.state !== "open") return { message: "Pull request is not open, Skipping the review", skip: true, completed: false }
        const changes = await step.run("fetch-changes", async () => {
            const changesResult = await octokit.paginate(octokit.pulls.listFiles, {
                owner, repo, pull_number, per_page: 100
            })
            return changesResult.map(change => ({
                filename: change.filename,
                status: change.status,
                changes: change.changes,
                patch: change.patch,
                additions: change.additions,
                delitions: change.deletions,
                previous_filename: change.previous_filename,

            }))
        })

        if (changes.length == 0) return { message: "There is no changes in this PR ", skip: true }
        //gpt-4o-mini
        const aiResponse = await step.run("analyse-using-ai", async () => {
            const llmResponse = await run(githubPullRequestReviewAgent,
                `
                    Pull Request Information:
                    ${JSON.stringify(pullRequestInfo, null, 2)}
                    \n\n
                    Changes:
                    ${JSON.stringify(changes, null, 2)}
                `,
            )

            return {
                result: llmResponse.finalOutput,
            }
        })

        await step.run('post-comment', async () => {
            const { criticalFixes, suggestions, content } = aiResponse.result;

            const sections = [content];

            if (criticalFixes?.length)
                sections.push(
                    `**Critical Changes:**\n${criticalFixes.map((fix) => `- ${fix}`).join('\n')}`,
                );

            if (suggestions?.length)
                sections.push(
                    `**Suggestions:**\n${suggestions.map((suggestion) => `- ${suggestion}`).join('\n')}`,
                );

            await octokit.issues.createComment({
                owner,
                repo,
                issue_number: pull_number,
                body: sections.join('\n\n'),
            });

        })

    },
);