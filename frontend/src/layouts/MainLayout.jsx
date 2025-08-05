import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function MainLayout({children}) {
    return(
    <div className="flex flex-col min-h-screen">
        <Navbar />
            <main className="flex-grow container mx-auto px-4 py-6">{children}</main>
        <Footer />
    </div>
    );
}