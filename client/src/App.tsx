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
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import Portfolios from "@/pages/portfolios";
import AuthPage from "@/pages/auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute
        path="/"
        component={() => (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/projects" component={ProjectList} />
              <Route path="/projects/:id" component={ProjectDetails} />
              <Route path="/portfolios" component={Portfolios} />
              <Route path="/team" component={Team} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      />
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