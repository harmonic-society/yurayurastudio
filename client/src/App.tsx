import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ProjectList from "@/pages/projects";
import ProjectDetails from "@/pages/projects/[id]";
import Leads from "@/pages/leads";
import LeadDetails from "@/pages/leads/[id]";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import Portfolios from "@/pages/portfolios";
import Timeline from "@/pages/timeline";
import MessagesPage from "@/pages/messages";
import AuthPage from "@/pages/auth";
import AdminUsers from "@/pages/admin/users";
import RegistrationRequests from "@/pages/admin/registration-requests";
import UserProfile from "@/pages/users/[id]";
import HelpPage from "@/pages/help";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="*">
        {() => (
          <Layout>
            <Switch>
              <ProtectedRoute path="/" component={Dashboard} />
              <ProtectedRoute path="/projects" component={ProjectList} />
              <ProtectedRoute path="/projects/:id" component={ProjectDetails} />
              <ProtectedRoute path="/leads" component={Leads} />
              <ProtectedRoute path="/leads/:id" component={LeadDetails} />
              <ProtectedRoute path="/portfolios" component={Portfolios} />
              <ProtectedRoute path="/timeline" component={Timeline} />
              <ProtectedRoute path="/messages" component={MessagesPage} />
              <ProtectedRoute path="/team" component={Team} />
              <ProtectedRoute path="/users/:id" component={UserProfile} />
              <ProtectedRoute path="/settings" component={Settings} />
              <ProtectedRoute path="/help" component={HelpPage} />
              <ProtectedRoute path="/admin/users" component={AdminUsers} />
              <ProtectedRoute path="/admin/registration-requests" component={RegistrationRequests} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;