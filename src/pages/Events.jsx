import ContentLibrary from '../components/ContentLibrary'
import { eventService } from '../services/api'
export default function Events() { return <ContentLibrary title="Events" description="Explore published ministry gatherings and register to participate." load={eventService.getAll} route="/events" register /> }
