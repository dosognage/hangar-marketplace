import { post as findAHangar } from './how-to-find-a-hangar'
import { post as tHangarVsBox } from './t-hangar-vs-box-hangar'
import { post as leaseTips } from './hangar-lease-tips'

export const ALL_POSTS = [findAHangar, tHangarVsBox, leaseTips].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
)

export type BlogPost = typeof ALL_POSTS[number]
