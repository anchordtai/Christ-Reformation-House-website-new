import ContentLibrary from '../components/ContentLibrary'
import { blogService } from '../services/api'
export default function Blog() { return <ContentLibrary title="Blog" description="Messages, reflections, and ministry updates." load={blogService.getAll} route="/blog" /> }
